import { test, expect } from '@playwright/test';
import { createServer, Server } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { runInNewContext } from 'node:vm';

/**
 * Bridge Engineering Lab — REAL WebGL smoke.
 *
 * The lab runs a method-of-joints solver and an Euler buckling check, then drew
 * the result as a single-plane side elevation. When the buckling margin got
 * thin it told the student to "add lateral bracing" and "shorten the unbraced
 * length" — about the one axis the elevation has no room for, and with no
 * control that could do either. These tests pin both halves of the fix: the
 * second truss plane and its bracing are really drawn, and the bracing really
 * feeds the buckling calculation.
 *
 * Serves the WORKING TREE with React UMD and three r128 from vendor/.
 */

const ROOT = process.cwd();
const MIME: Record<string, string> = {
  '.js': 'text/javascript; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
};

const HARNESS = `<!doctype html>
<html><head><meta charset="utf-8"><title>bridgelab harness</title>
<style>html,body{margin:0;height:100%;background:#0f172a}
#wrap{width:900px;height:1400px;overflow:hidden}</style></head>
<body><div id="wrap"></div>
<script src="/desktop/web-app/node_modules/react/umd/react.production.min.js"></script>
<script src="/desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js"></script>
<script src="/vendor/three-r128/three.min.js"></script>
<script src="/stem_lab/stem_lab_module.js"></script>
<script>
  window.__events = { errors: [], sr: [] };
  window.addEventListener('error', function (e) { window.__events.errors.push(String(e.message)); });
  window.StemLab.ensureThree = function () { return Promise.resolve(window.THREE); };
  window.StemLab.loadScriptResilient = function () { return new Promise(function () {}); };
</script>
<script src="/stem_lab/stem_tool_bridgelab.js"></script>
<script>
  var e = React.createElement;
  window.__mount = function (bucket) {
    var cfg = window.StemLab._registry.bridgeLab;
    window.__toolData = { bridgeLab: Object.assign({}, bucket || {}) };
    var bump = null;
    var ctx = {
      React: React,
      get toolData() { return window.__toolData; },
      setToolData: function (fn) {
        window.__toolData = typeof fn === 'function' ? fn(window.__toolData) : fn;
        if (bump) bump();
      },
      update: function (b, k, v) {
        window.__toolData = Object.assign({}, window.__toolData);
        window.__toolData[b] = Object.assign({}, window.__toolData[b]);
        window.__toolData[b][k] = v;
        if (bump) bump();
      },
      updateMulti: function (b, patch) {
        window.__toolData = Object.assign({}, window.__toolData);
        window.__toolData[b] = Object.assign({}, window.__toolData[b], patch);
        if (bump) bump();
      },
      setStemLabTool: function () {}, setStemLabTab: function () {},
      addToast: function () {}, awardXP: function () {}, getXP: function () { return 0; },
      announceToSR: function (m) { window.__events.sr.push(String(m)); },
      celebrate: function () {}, beep: function () {},
      callGemini: null, gradeLevel: '8th Grade', toolSnapshots: [], props: {},
      t: function (k, fb) { return fb || k; },
      icons: new Proxy({}, { get: function () { return function () { return e('span'); }; } }),
      a11yClick: function (fn) { return { onClick: fn, role: 'button', tabIndex: 0 }; },
      srOnly: {}
    };
    function Comp() {
      var st = React.useState(0);
      bump = function () { st[1](function (n) { return n + 1; }); };
      window.__bump = bump;
      return cfg.render(ctx);
    }
    window.__root = ReactDOM.createRoot(document.getElementById('wrap'));
    window.__root.render(e(Comp));
    return !!cfg;
  };
  window.__destroy = function () { if (window.__root) { window.__root.unmount(); window.__root = null; } };
  window.__gl = function () { return window.__alloBridgeGL ? window.__alloBridgeGL.debug() : null; };
  window.__bucket = function () { return window.__toolData.bridgeLab; };
  window.__set = function (patch) {
    window.__toolData = Object.assign({}, window.__toolData);
    window.__toolData.bridgeLab = Object.assign({}, window.__toolData.bridgeLab, patch);
    window.__render();
  };
  window.__render = function () { window.__bump && window.__bump(); };
  window.__canvasCount = function () { return document.querySelectorAll('canvas[data-bridge-gl]').length; };
  window.__svgCount = function () { return document.querySelectorAll('svg').length; };
  window.__text = function () { return document.body.innerText; };
</script>
</body></html>`;

let server: Server;
let base: string;

test.beforeAll(async () => {
  server = createServer(async (req, res) => {
    const url = (req.url || '/').split('?')[0];
    if (url === '/__harness') {
      res.writeHead(200, { 'content-type': MIME['.html'] });
      res.end(HARNESS);
      return;
    }
    try {
      const rel = normalize(decodeURIComponent(url)).replace(/^([/\\])+/, '');
      const file = join(ROOT, rel);
      if (!file.startsWith(ROOT)) { res.writeHead(403); res.end('no'); return; }
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end('not found');
    }
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const addr = server.address();
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
});

test.afterAll(async () => {
  await new Promise<void>((r) => server.close(() => r()));
});

type Pg = import('@playwright/test').Page;
const ENHANCEMENT_REPORT = process.env.BRIDGE_REPORT_DIR || join(ROOT, 'reports', 'bridgelab-immersive-earthquake-2026-09-28');
const IMMERSIVE_REPORT = ENHANCEMENT_REPORT;
const INVESTIGATION_REPORT = process.env.BRIDGE_REPORT_DIR || join(ROOT, 'reports', 'bridgelab-investigation-2026-09-29');
const REPLAY_REPORT = process.env.BRIDGE_REPORT_DIR || join(ROOT, 'reports', 'bridgelab-replay-2026-09-29');
const COMPARISON_REPORT = process.env.BRIDGE_REPORT_DIR || join(ROOT, 'reports', 'bridgelab-comparison-2026-09-29');
const FREQUENCY_REPORT = process.env.BRIDGE_REPORT_DIR || join(ROOT, 'reports', 'bridgelab-frequency-2026-09-29');
const DECAY_FRACTION_REPORT = process.env.BRIDGE_REPORT_DIR || join(ROOT, 'reports', 'bridgelab-decay-fraction-2026-10-05');

type GuideInputs = Record<string, unknown>;
type GuideEnergyField = 'initial' | 'remaining' | 'damping' | 'residual';
type GuideEnergyOracle = {
  bridgeSeismicResponse: (inputs: GuideInputs) => any;
  bridgeSeismicEnergyInterval: (response: any, start: number, end: number) => any;
  bridgeSeismicSample: (response: any, time: number) => any;
};

async function loadGuideEnergyOracle(): Promise<GuideEnergyOracle> {
  const source = await readFile(join(ROOT, 'stem_lab', 'stem_tool_bridgelab.js'), 'utf8');
  const sandbox: any = { window: { StemLab: { registerTool() {} } }, console };
  runInNewContext(source.replace("window.StemLab.registerTool('bridgeLab', {", `
    window.__guideEnergyOracle = { bridgeSeismicResponse, bridgeSeismicEnergyInterval, bridgeSeismicSample };
    window.StemLab.registerTool('bridgeLab', {`), sandbox);
  return sandbox.window.__guideEnergyOracle;
}

async function guidePairInputs(page: Pg): Promise<GuideInputs[]> {
  return page.evaluate(() => {
    const bucket = (window as any).__bucket();
    return [bucket.seismicGuideBaseline.inputs, {
      archetype: bucket.seismicArchetype, groundFrequencyHz: bucket.seismicFrequencyHz,
      intensityG: bucket.seismicIntensityG, dampingRatio: bucket.seismicDampingRatio
    }];
  });
}

async function checkGuideEnergyBudget(
  readings: import('@playwright/test').Locator,
  oracle: GuideEnergyOracle,
  inputs: GuideInputs[],
  time: number
) {
  const budget = readings.locator('[data-guide-energy-budget]');
  await expect(budget).toHaveCount(1);
  await expect(budget).toHaveAttribute('data-guide-energy-start', '16');
  await expect(budget).toHaveAttribute('data-guide-energy-end', String(time));
  const range = Number(await budget.getAttribute('data-guide-energy-range'));
  expect(Number.isFinite(range)).toBe(true);
  expect(range).toBeGreaterThan(0);
  await expect(readings.locator('[data-guide-number]')).toHaveCount(8);
  const intervals = inputs.map(input => oracle.bridgeSeismicEnergyInterval(oracle.bridgeSeismicResponse(input), 16, time));
  const expectedRange = intervals.reduce((maximum, interval) => Math.max(
    maximum, interval.earlier.storedJPerKg, interval.later.storedJPerKg + interval.dissipatedJPerKg
  ), 0);
  // Node and Chromium can round transcendental model calculations differently.
  // Bound cross-engine errors by paired energy, including near-zero residuals;
  // keep true zeros exact and avoid an absolute tolerance floor for tiny inputs.
  const engineTolerance = expectedRange * 2e-10;

  for (const [index, id] of ['a', 'b'].entries()) {
    const interval = intervals[index];
    const expected: Record<GuideEnergyField, number> = {
      initial: interval.earlier.storedJPerKg,
      remaining: interval.later.storedJPerKg,
      damping: interval.dissipatedJPerKg,
      residual: interval.balanceErrorJPerKg
    };
    const trial = budget.locator('[data-guide-energy-trial="' + id + '"]');
    for (const field of Object.keys(expected) as GuideEnergyField[]) {
      const value = Number(await trial.locator('[data-guide-energy-field="' + field + '"]').getAttribute('data-guide-energy-value'));
      if (expected[field] === 0) {
        expect(value, id + ' ' + field + ' retains true zero').toBe(0);
      } else {
        expect(Math.abs(value - expected[field]), id + ' ' + field + ' comes from the recorded interval')
          .toBeLessThanOrEqual(engineTolerance);
      }
      if (field === 'residual') continue;
      expect(range).toBeGreaterThanOrEqual(value);
      const bar = trial.locator('[data-guide-energy-bar="' + field + '"]');
      if (expected[field] === 0) {
        await expect(bar).toHaveCount(0);
      } else {
        expect(value).not.toBe(0);
        await expect(bar).toHaveCount(1);
        expect(Number(await bar.getAttribute('width')), id + ' ' + field + ' uses the common scale')
          .toBeCloseTo(value / range * 400, 10);
      }
    }
    await expect(trial.locator('[data-guide-energy-field="remaining"]'))
      .toHaveAttribute('data-guide-value', id);
  }
  if (expectedRange === 0) {
    expect(range, 'zero-energy range keeps its exact finite fallback').toBe(1);
  } else {
    expect(Math.abs(range - expectedRange), 'both trials share one absolute energy range')
      .toBeLessThanOrEqual(engineTolerance);
  }
  return budget;
}

async function openGuideDecayFractions(readings: import('@playwright/test').Locator) {
  const disclosure = readings.locator('[data-guide-decay-disclosure]');
  const summary = disclosure.locator(':scope > summary');
  await expect(summary).toHaveText('Compare the fraction remaining');
  if (!await disclosure.evaluate(node => (node as HTMLDetailsElement).open)) {
    await summary.focus();
    await summary.press('Enter');
    await expect(summary).toBeFocused();
  }
  await expect(disclosure).toHaveAttribute('open', '');
}

async function checkGuideDecayFractions(
  readings: import('@playwright/test').Locator,
  oracle: GuideEnergyOracle,
  inputs: GuideInputs[],
  time: number
) {
  const budget = readings.locator('[data-guide-energy-budget]');
  const fractions = budget.locator('[data-guide-decay-fractions]');
  await expect(fractions).toHaveCount(1);
  await expect(fractions).toBeVisible();
  await expect(fractions).toHaveAttribute('data-guide-decay-start', '16');
  await expect(fractions).toHaveAttribute('data-guide-decay-end', String(time));
  const intervals = inputs.map(input => oracle.bridgeSeismicEnergyInterval(oracle.bridgeSeismicResponse(input), 16, time));
  const ratios = intervals.map(interval => interval.earlier.storedJPerKg > 0
    ? interval.later.storedJPerKg / interval.earlier.storedJPerKg : null);
  const expectedRange = Math.max(1, ...ratios.filter((ratio): ratio is number => ratio !== null && Number.isFinite(ratio)));
  const range = Number(await fractions.getAttribute('data-guide-decay-range'));
  // These are dimensionless fractions. The 100% reference supplies the scale;
  // allow only cross-engine model rounding, without a J/kg tolerance floor.
  const engineTolerance = expectedRange * 2e-10;
  expect(Number.isFinite(range)).toBe(true);
  expect(range).toBeGreaterThanOrEqual(1);
  expect(Math.abs(range - expectedRange)).toBeLessThanOrEqual(engineTolerance);

  for (const [index, id] of ['a', 'b'].entries()) {
    const trial = fractions.locator('[data-guide-decay-trial="' + id + '"]');
    const energyTrial = budget.locator('[data-guide-energy-trial="' + id + '"]');
    const initialText = await energyTrial.locator('[data-guide-energy-field="initial"]').getAttribute('data-guide-energy-value');
    const remainingText = await energyTrial.locator('[data-guide-energy-field="remaining"]').getAttribute('data-guide-energy-value');
    await expect(trial).toHaveAttribute('data-guide-decay-initial', initialText!);
    await expect(trial).toHaveAttribute('data-guide-decay-remaining', remainingText!);
    const amountsText = await trial.locator('[data-guide-decay-amounts]').textContent();
    const displayedAmounts = [...(amountsText || '').matchAll(/(-?\d+(?:\.\d+)?(?:e[+-]?\d+)?)\s+J\/kg/gi)]
      .map(match => Number(match[1]));
    expect(displayedAmounts, id + ' shows remaining and starting energies with units').toHaveLength(2);
    expect(displayedAmounts.every(Number.isFinite)).toBe(true);
    const reading = trial.locator('[data-guide-decay-value]');
    const bar = trial.locator('[data-guide-decay-bar]');
    const reference = trial.locator('[data-guide-decay-reference]');
    const expected = ratios[index];
    if (expected === null || !Number.isFinite(expected)) {
      expect(Number(initialText), id + ' has no starting energy').toBe(0);
      expect(displayedAmounts[1], id + ' displays its true zero denominator').toBe(0);
      await expect(trial.locator('[data-guide-decay-undefined]')).toBeVisible();
      await expect(reading).toHaveCount(0);
      await expect(bar).toHaveCount(0);
      await expect(reference).toHaveCount(0);
      continue;
    }
    await expect(trial.locator('[data-guide-decay-undefined]')).toHaveCount(0);
    await expect(reading).toBeVisible();
    await expect(reading).toContainText('%');
    const actual = Number(await reading.getAttribute('data-guide-decay-fraction'));
    expect(actual, id + ' uses its own recorded denominator').toBe(Number(remainingText) / Number(initialText));
    expect(displayedAmounts[1], id + ' displays a nonzero denominator').toBeGreaterThan(0);
    const displayedQuotient = displayedAmounts[0] / displayedAmounts[1];
    if (actual === 0) {
      expect(displayedQuotient, id + ' preserves a true zero quotient').toBe(0);
    } else {
      expect(Math.abs(displayedQuotient - actual), id + ' displayed energies support its recorded fraction')
        .toBeLessThanOrEqual(Math.abs(actual) * 2e-5);
    }
    if (expected === 0 || time === 16) {
      expect(actual).toBe(expected);
    } else {
      expect(Math.abs(actual - expected), id + ' fraction comes from the independent model interval')
        .toBeLessThanOrEqual(engineTolerance);
    }
    await expect(reference).toHaveCount(1);
    expect(Number(await reference.getAttribute('x1')), id + ' marks its own 100% starting energy')
      .toBeCloseTo(400 / range, 10);
    if (actual === 0) {
      await expect(bar).toHaveCount(0);
    } else {
      await expect(bar).toHaveCount(1);
      expect(Number(await bar.getAttribute('width')), id + ' bar uses the browser fraction and common range')
        .toBeCloseTo(actual / range * 400, 10);
    }
  }
  return fractions;
}

async function openGuideStartingEnergy(readings: import('@playwright/test').Locator) {
  const disclosure = readings.locator('[data-guide-shaking-disclosure]');
  const summary = disclosure.locator(':scope > summary');
  await expect(summary).toHaveText('Where did the starting energy come from?');
  if (!await disclosure.evaluate(node => (node as HTMLDetailsElement).open)) {
    await summary.focus();
    await summary.press('Enter');
    await expect(summary).toBeFocused();
  }
  await expect(disclosure).toHaveAttribute('open', '');
}

async function checkGuideShakingLegend(frame: import('@playwright/test').Locator) {
  const swatches = await frame.locator('[data-guide-shaking-swatch]').evaluateAll(nodes => nodes.map(node => {
    const rect = node.querySelector('[data-guide-shaking-swatch-fill]')!;
    return { field: node.getAttribute('data-guide-shaking-swatch'), hidden: node.getAttribute('aria-hidden'),
      fill: getComputedStyle(rect).fill, pattern: node.querySelector('pattern')?.getAttribute('id') || null };
  }));
  expect(swatches.map(swatch => swatch.field)).toEqual(['stored', 'added', 'damping', 'returned']);
  for (const swatch of swatches) expect(swatch.hidden).toBe('true');
  expect(swatches[0].fill).toBe('rgb(125, 211, 252)');
  expect(swatches[1].fill).toBe('rgb(94, 234, 212)');
  for (const swatch of swatches.slice(2)) {
    expect(swatch.pattern).not.toBeNull();
    expect(swatch.fill).toContain('url(');
    expect(swatch.fill).toContain(swatch.pattern!);
  }
}

async function checkGuideStartingEnergy(
  readings: import('@playwright/test').Locator,
  oracle: GuideEnergyOracle,
  inputs: GuideInputs[]
) {
  const frame = readings.locator('[data-guide-shaking-budget]');
  await expect(frame).toHaveCount(1);
  await expect(frame).toBeVisible();
  await expect(frame).toHaveAttribute('data-guide-shaking-start', '0');
  await expect(frame).toHaveAttribute('data-guide-shaking-end', '16');
  const intervals = inputs.map(input => oracle.bridgeSeismicEnergyInterval(oracle.bridgeSeismicResponse(input), 0, 16));
  const scale = Math.max(...intervals.flatMap(interval => [
    Math.abs(interval.earlier.storedJPerKg), Math.abs(interval.inputJPerKg),
    Math.abs(interval.dissipatedJPerKg), Math.abs(interval.later.storedJPerKg)
  ]));
  const tolerance = scale * 2e-10;
  for (const [index, id] of ['a', 'b'].entries()) {
    const interval = intervals[index];
    const expected = { initial: interval.earlier.storedJPerKg, input: interval.inputJPerKg,
      damping: interval.dissipatedJPerKg, stored: interval.later.storedJPerKg, residual: interval.balanceErrorJPerKg };
    const trial = frame.locator('[data-guide-shaking-trial="' + id + '"]');
    await expect(trial.getByRole('table')).toHaveCount(1);
    await expect(trial.locator('th[scope="row"]')).toHaveCount(3);
    for (const [field, value] of Object.entries(expected)) {
      const reading = trial.locator('[data-guide-shaking-field="' + field + '"]');
      const actual = Number(await reading.getAttribute('data-guide-shaking-value'));
      expect(Number.isFinite(actual)).toBe(true);
      if (value === 0) expect(actual, id + ' ' + field + ' keeps true zero').toBe(0);
      else expect(Math.abs(actual - value), id + ' ' + field + ' uses recorded 0–16 s values').toBeLessThanOrEqual(tolerance);
      await expect(reading).toContainText('J/kg');
      const shown = (await reading.textContent())!.replace(/−/g, '-').match(/[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/i);
      expect(shown).not.toBeNull();
      if (value !== 0) expect(Number(shown![0]), 'rounded nonzero readings remain nonzero').not.toBe(0);
      if (field === 'input' && actual > 0) expect(shown![0]).toMatch(/^\+/);
    }
    const source = await trial.locator('[data-guide-shaking-field="stored"]').getAttribute('data-guide-shaking-value');
    await expect(readings.locator('[data-guide-energy-trial="' + id + '"] [data-guide-energy-field="initial"]'))
      .toHaveAttribute('data-guide-energy-value', source!);
  }
  const expectedScale = Math.max(...intervals.flatMap(interval => [
    interval.earlier.storedJPerKg + Math.max(0, interval.inputJPerKg),
    interval.later.storedJPerKg + interval.dissipatedJPerKg + Math.max(0, -interval.inputJPerKg)
  ]));
  const snapshot = await guideStartingSnapshot(frame);
  const rawScale = Number(snapshot[0].range);
  if (expectedScale === 0) expect(rawScale).toBe(1);
  else expect(Math.abs(rawScale - expectedScale)).toBeLessThanOrEqual(expectedScale * 2e-10);
  const rows = snapshot.map(trial => Object.fromEntries(trial.values.map(reading => [reading.field!, Number(reading.value)])));
  const measuredScale = Math.max(...rows.flatMap(row => [row.initial + Math.max(0, row.input),
    row.stored + row.damping + Math.max(0, -row.input)]));
  expect(rawScale).toBe(measuredScale > 0 ? measuredScale : 1);
  await expect(frame.locator('[data-guide-shaking-zero]')).toHaveCount(measuredScale === 0 ? 1 : 0);
  const legend = frame.locator('[data-guide-shaking-legend]');
  await expect(legend).toHaveCount(1);
  expect(await legend.evaluate(node => node.closest('svg') === null)).toBe(true);
  await checkGuideShakingLegend(frame);
  for (const [index, trial] of snapshot.entries()) {
    const row = rows[index];
    const expected: Record<string, { amount: number, before: number, y: number }> = {
      initial: { amount: row.initial, before: 0, y: 2 },
      added: { amount: Math.max(0, row.input), before: row.initial, y: 2 },
      stored: { amount: row.stored, before: 0, y: 32 },
      damping: { amount: row.damping, before: row.stored, y: 32 },
      returned: { amount: Math.max(0, -row.input), before: row.stored + row.damping, y: 32 }
    };
    const figure = frame.locator('[data-guide-shaking-bars="' + trial.id + '"]');
    await expect(figure.locator('svg')).toHaveAttribute('aria-hidden', 'true');
    await expect(figure.locator('svg')).toHaveAttribute('preserveAspectRatio', 'none');
    await expect(figure.locator('figcaption')).toContainText('Top: initial stored + net added');
    await expect(figure.locator('figcaption')).toContainText('Bottom: stored at 16 s + damping + net removed');
    expect(trial.tracks).toEqual([
      { field: 'available', x: '0', y: '2', width: '400', height: '14' },
      { field: 'accounted', x: '0', y: '32', width: '400', height: '14' }
    ]);
    expect(trial.bars.map(bar => bar.field)).toEqual(Object.keys(expected).filter(field => expected[field].amount !== 0));
    for (const bar of trial.bars) {
      const term = expected[bar.field!];
      expect(Number(bar.amount)).toBe(term.amount);
      expect(Number(bar.width)).toBe(term.amount / rawScale * 400);
      expect(Number(bar.x)).toBe(term.before / rawScale * 400);
      expect(Number(bar.y)).toBe(term.y);
      expect(Number(bar.height)).toBe(14);
    }
  }
  await expect(frame).toContainText('Calculations use unrounded energies; displayed readings are rounded.');
  await expect(frame).toContainText('Input power per kg');
  return frame;
}

async function guideStartingSnapshot(frame: import('@playwright/test').Locator) {
  return frame.evaluate(node => [...node.querySelectorAll('[data-guide-shaking-trial]')].map(trial => ({
    id: trial.getAttribute('data-guide-shaking-trial'),
    range: node.getAttribute('data-guide-shaking-range'),
    values: [...trial.querySelectorAll('[data-guide-shaking-field]')].map(reading => ({
      field: reading.getAttribute('data-guide-shaking-field'), value: reading.getAttribute('data-guide-shaking-value')
    })),
    bars: [...trial.querySelectorAll('[data-guide-shaking-bar]')].map(bar => ({
      field: bar.getAttribute('data-guide-shaking-bar'), amount: bar.getAttribute('data-guide-shaking-amount'),
      x: bar.getAttribute('x'), y: bar.getAttribute('y'), width: bar.getAttribute('width'), height: bar.getAttribute('height')
    })),
    tracks: [...trial.querySelectorAll('[data-guide-shaking-track]')].map(track => ({
      field: track.getAttribute('data-guide-shaking-track'), x: track.getAttribute('x'), y: track.getAttribute('y'),
      width: track.getAttribute('width'), height: track.getAttribute('height')
    }))
  })));
}

async function guideDecaySnapshot(fractions: import('@playwright/test').Locator) {
  return fractions.evaluate(figure => ({
    start: figure.getAttribute('data-guide-decay-start'),
    end: figure.getAttribute('data-guide-decay-end'),
    range: figure.getAttribute('data-guide-decay-range'),
    trials: [...figure.querySelectorAll('[data-guide-decay-trial]')].map(trial => ({
      id: trial.getAttribute('data-guide-decay-trial'),
      initial: trial.getAttribute('data-guide-decay-initial'),
      remaining: trial.getAttribute('data-guide-decay-remaining'),
      fraction: trial.querySelector('[data-guide-decay-value]')?.getAttribute('data-guide-decay-fraction') ?? null,
      width: trial.querySelector('[data-guide-decay-bar]')?.getAttribute('width') ?? null,
      reference: trial.querySelector('[data-guide-decay-reference]')?.getAttribute('x1') ?? null,
      undefined: !!trial.querySelector('[data-guide-decay-undefined]')
    }))
  }));
}

async function mount(page: Pg, bucket: Record<string, unknown> = {}) {
  await page.goto(`${base}/__harness`);
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.bridgeLab);
  await page.evaluate((b) => (window as any).__mount(b), Object.assign({ tab: 'build' }, bucket));
  await page.waitForSelector('canvas[data-bridge-gl="true"]', { timeout: 30000 });
  // The viewer deliberately suspends repainting offscreen. Exercise changes
  // with the stage visible, as a learner would, instead of sampling stale GL state.
  await page.locator('canvas[data-bridge-gl="true"]').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => (window as any).__gl()?.state === 'ready', null, { timeout: 30000 });
  await page.waitForTimeout(400);
}

async function mountWorkflow(page: Pg, width: number, bucket: Record<string, unknown> = {}) {
  await page.setViewportSize({ width, height: 900 });
  await mount(page, Object.assign({ introDismissed: true }, bucket));
  // Match the app shell's box sizing and viewport-bound desktop panel. At phone
  // widths the tool's responsive rule deliberately switches to document flow.
  await page.addStyleTag({ content: `
    *,*::before,*::after{box-sizing:border-box}
    body{font-family:system-ui,sans-serif}
    #wrap{width:100%;max-width:1100px;height:${width <= 640 ? 'auto' : '100vh'};margin:0 auto;overflow:${width <= 640 ? 'visible' : 'hidden'}}
  ` });
  await mkdir(ENHANCEMENT_REPORT, { recursive: true });
}

async function checkWorkflowHealth(page: Pg) {
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  const extent = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth
  }));
  expect(extent.document, 'document horizontal overflow').toBeLessThanOrEqual(extent.viewport + 1);
  expect(extent.body, 'body horizontal overflow').toBeLessThanOrEqual(extent.viewport + 1);
}

async function checkBridgeCanvasFillsStage(page: Pg) {
  await expect.poll(() => page.locator('canvas[data-bridge-gl]').evaluate(canvas => {
    const stage = canvas.closest('[data-allo-fs-stage]') as HTMLElement;
    const element = canvas as HTMLCanvasElement;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    return Math.max(Math.abs(element.clientHeight - stage.clientHeight),
      Math.abs(element.clientWidth - stage.clientWidth),
      Math.abs(element.height / ratio - stage.clientHeight),
      Math.abs(element.width / ratio - stage.clientWidth));
  }), { message: 'the CSS canvas and drawing buffer fill the whole stage' }).toBeLessThanOrEqual(1);
}

async function captureRegion(page: Pg, region: import('@playwright/test').Locator, name: string) {
  const viewport = page.viewportSize();
  // A locator image cannot see through the desktop panel's scroll clipping.
  // Give the real panel enough height for this region while retaining its width.
  // Restore the normal viewport before the next interaction/overflow assertion.
  if (viewport && viewport.width > 640) {
    const height = await region.evaluate((element) => element.getBoundingClientRect().height);
    await page.setViewportSize({ width: viewport.width, height: Math.max(viewport.height, Math.ceil(height) + 1000) });
  }
  await region.screenshot({ path: join(ENHANCEMENT_REPORT, name) });
  if (viewport) await page.setViewportSize(viewport);
}

async function captureImmersiveRegion(page: Pg, region: import('@playwright/test').Locator, name: string, folder = IMMERSIVE_REPORT) {
  const destination = process.env.BRIDGE_CAPTURE_REPORT || folder;
  await mkdir(destination, { recursive: true });
  const viewport = page.viewportSize();
  if (viewport && viewport.width > 640) {
    const height = await region.evaluate(element => element.getBoundingClientRect().height);
    await page.setViewportSize({ width: viewport.width, height: Math.max(viewport.height, Math.ceil(height) + 1500) });
  }
  await region.scrollIntoViewIfNeeded();
  await region.screenshot({ path: join(destination, name) });
  if (viewport) await page.setViewportSize(viewport);
}


type FlowPath = 'input' | 'exchange' | 'damping';

async function checkNativeEnergyFlow(
  frame: import('@playwright/test').Locator,
  oracle: GuideEnergyOracle,
  inputs: GuideInputs,
  time: number
) {
  const diagram = frame.locator('[data-flow-diagram="true"]');
  await expect(diagram).toHaveAttribute('role', 'group');
  await expect(frame).toHaveAttribute('data-flow-frame', String(time));
  const external = diagram.locator('[data-flow-group="external"]');
  const internal = diagram.locator('[data-flow-group="internal"]');
  await expect(diagram.locator('[data-flow-group]')).toHaveCount(2);
  await expect(external.locator('[data-flow-group-caption]')).toHaveText('External exchange');
  await expect(internal.locator('[data-flow-group-caption]')).toHaveText('Internal exchange');
  await expect(internal).toContainText('Kinetic and elastic energy exchange within stored mechanical energy.');
  await expect(external.locator('[data-flow-path]')).toHaveCount(2);
  await expect(internal.locator('[data-flow-path="exchange"]')).toHaveCount(1);
  await expect(diagram.locator('svg text')).toHaveCount(0);
  expect(await diagram.locator('[data-flow-group-caption],[data-flow-node],[data-flow-rate]')
    .evaluateAll(nodes => nodes.every(node => !node.closest('svg'))), 'all labels and rates are native text').toBe(true);

  // Check recorded point powers, including interpolated recorded fields. Do
  // not recalculate products from interpolated displacement and velocity.
  const point = oracle.bridgeSeismicSample(oracle.bridgeSeismicResponse(inputs), time);
  const expected: Record<FlowPath, number> = {
    input: point.inputPowerWPerKg, exchange: point.elasticPowerWPerKg, damping: point.dampingPowerWPerKg
  };
  const endpoints: Record<FlowPath, [string, string]> = {
    input: ['Ground interaction', 'Stored'], exchange: ['Kinetic', 'Elastic'], damping: ['Stored', 'Dissipated']
  };
  const tolerance = Math.max(...Object.values(expected).map(Math.abs), Math.abs(point.storedPowerWPerKg)) * 2e-10;
  const rates: Record<string, number> = {};
  const arrows: Record<string, unknown> = {};
  const labels: Record<string, string> = {};
  for (const id of ['input', 'exchange', 'damping'] as FlowPath[]) {
    const row = frame.locator('[data-flow-path="' + id + '"]');
    await expect(row).toHaveAttribute('role', 'group');
    expect(await row.evaluate(node => node.tagName)).toBe('DIV');
    const power = Number(await row.getAttribute('data-flow-power'));
    expect(Number.isFinite(power)).toBe(true);
    if (expected[id] === 0) expect(power, id + ' retains true zero').toBe(0);
    else expect(Math.abs(power - expected[id]), id + ' comes from the selected recorded frame').toBeLessThanOrEqual(tolerance);
    rates[id] = power;
    const direction = Math.sign(power);
    await expect(row).toHaveAttribute('data-flow-direction', String(direction));
    await expect(row.locator('[data-flow-node="from"]')).toHaveText(endpoints[id][0]);
    await expect(row.locator('[data-flow-node="to"]')).toHaveText(endpoints[id][1]);
    const numberText = power === 0 ? '0.000' : Math.abs(power) < 0.001 ? Math.abs(power).toExponential(2) : Math.abs(power).toFixed(3);
    const route = power === 0 ? 'No transfer: ' + endpoints[id].join(' / ')
      : (power > 0 ? endpoints[id] : [...endpoints[id]].reverse()).join(' → ');
    await expect(row).toHaveAttribute('aria-label', route + ': ' + numberText + ' W/kg');
    labels[id] = (await row.getAttribute('aria-label'))!;
    const reading = row.locator('[data-flow-rate="' + id + '"]');
    await expect(reading).toHaveAttribute('data-flow-rate-value', String(Math.abs(power)));
    await expect(reading.locator('strong')).toHaveText(numberText + ' W/kg');
    if (power === 0) await expect(reading).toContainText('No transfer');
    if (power !== 0 && Math.abs(power) < 0.001) {
      expect(numberText).toMatch(/e-/);
      expect(numberText).not.toBe('0.000');
    }
    const arrow = row.locator('[data-flow-arrow="' + id + '"]');
    await expect(arrow).toHaveAttribute('aria-hidden', 'true');
    await expect(arrow).toHaveAttribute('focusable', 'false');
    await expect(arrow).toHaveAttribute('viewBox', '0 0 44 24');
    await expect(arrow).toHaveAttribute('width', '44');
    await expect(arrow).toHaveAttribute('height', '24');
    await expect(arrow.locator('text')).toHaveCount(0);
    const geometry = await arrow.evaluate(node => {
      const root = node as SVGSVGElement, line = root.querySelector('line') as SVGLineElement;
      const bounds = root.getBoundingClientRect();
      return { width: bounds.width, height: bounds.height,
        line: [line.x1.baseVal.value, line.x2.baseVal.value, line.y1.baseVal.value, line.y2.baseVal.value],
        strokeWidth: line.getAttribute('stroke-width'), dash: line.getAttribute('stroke-dasharray'),
        path: root.querySelector('path')?.getAttribute('d') || null,
        circle: root.querySelector('circle') ? [
          (root.querySelector('circle') as SVGCircleElement).cx.baseVal.value,
          (root.querySelector('circle') as SVGCircleElement).cy.baseVal.value,
          (root.querySelector('circle') as SVGCircleElement).r.baseVal.value
        ] : null };
    });
    expect(geometry.width, 'arrows retain their readable width at phone size').toBeCloseTo(44, 4);
    expect(geometry.height).toBeCloseTo(24, 4);
    expect(geometry.line).toEqual([4, 40, 12, 12]);
    expect(geometry.strokeWidth).toBe(direction === 0 ? '1' : '3');
    if (direction === 0) {
      expect(geometry.path).toBeNull();
      expect(geometry.circle).toEqual([22, 12, 3]);
      expect(geometry.dash).toBe('3 4');
    } else {
      expect(geometry.path).toBe(direction > 0 ? 'M32 5 L40 12 L32 19' : 'M12 5 L4 12 L12 19');
      expect(geometry.circle).toBeNull();
      expect(geometry.dash).toBeNull();
    }
    arrows[id] = geometry;
    expect(await row.evaluate(node => node.scrollWidth - node.clientWidth), id + ' wraps within the native row').toBeLessThanOrEqual(1);
    expect(await reading.locator('strong').evaluate(node => getComputedStyle(node).fontSize), 'rates remain ordinary readable text').toBe('12px');
  }
  const stored = Number(await frame.locator('[data-flow-stored-rate]').getAttribute('data-flow-stored-rate'));
  if (point.storedPowerWPerKg === 0) expect(stored).toBe(0);
  else expect(Math.abs(stored - point.storedPowerWPerKg)).toBeLessThanOrEqual(tolerance);
  expect(stored).toBeCloseTo(rates.input - rates.damping, 12);
  expect(rates.damping).toBeGreaterThanOrEqual(0);
  const storedText = stored === 0 ? '0.000' : Math.abs(stored) < 0.001 ? Math.abs(stored).toExponential(2) : Math.abs(stored).toFixed(3);
  await expect(frame.locator('[data-flow-stored-rate]')).toContainText(storedText + ' W/kg');
  const description = (await diagram.getAttribute('aria-label'))!;
  for (const label of Object.values(labels)) expect(description).toContain(label);
  expect(description).toContain(storedText + ' W/kg');
  const scientific = [...Object.values(rates), stored].some(rate => rate !== 0 && Math.abs(rate) < 0.001);
  await expect(frame.locator('[data-flow-scientific-help]')).toHaveCount(scientific ? 1 : 0);
  if (scientific) await expect(frame.locator('[data-flow-scientific-help]')).toContainText('2.5e-6 means 0.0000025');
  expect(await frame.evaluate(node => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1);
  return { rates, stored, arrows, labels, description };
}

async function checkEnergyFlowReachability(frame: import('@playwright/test').Locator) {
  for (const id of ['input', 'exchange', 'damping']) {
    const reading = frame.locator('[data-flow-rate="' + id + '"]');
    await reading.evaluate(node => node.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }));
    const bounds = await reading.evaluate(node => {
      const row = node.getBoundingClientRect();
      const panel = node.closest('[data-bridge-scene-readout]')?.getBoundingClientRect();
      return { top: row.top, bottom: row.bottom, panelTop: panel?.top, panelBottom: panel?.bottom };
    });
    if (bounds.panelTop !== undefined && bounds.panelBottom !== undefined) {
      expect(bounds.top, id + ' rate clears the scrollable panel top').toBeGreaterThanOrEqual(bounds.panelTop + 2);
      expect(bounds.bottom, id + ' rate is reachable above the panel bottom').toBeLessThanOrEqual(bounds.panelBottom - 2);
    }
  }
}

async function captureNativeEnergyFlow(page: Pg, frame: import('@playwright/test').Locator, name: string) {
  const inScene = await frame.evaluate(node => !!node.closest('[data-bridge-scene-readout]'));
  if (!inScene) return captureImmersiveRegion(page, frame, name, ENHANCEMENT_REPORT);
  // Preserve the narrow scene-panel width but use a tall fullscreen viewport
  // for the complete evidence image. Ordinary-height reachability is checked
  // separately using the product's native panel scroll, before this capture.
  await checkEnergyFlowReachability(frame);
  const viewport = page.viewportSize()!;
  async function state() {
    return frame.evaluate(node => ({ time: node.getAttribute('data-flow-frame'), trial: node.getAttribute('data-flow-trial'),
      powers: [...node.querySelectorAll('[data-flow-path]')].map(row => [row.getAttribute('data-flow-path'), row.getAttribute('data-flow-power')]),
      stored: node.querySelector('[data-flow-stored-rate]')?.getAttribute('data-flow-stored-rate') }));
  }
  const before = await state();
  const alreadyFullscreen = await page.getByRole('button', { name: 'Exit fullscreen 3D bridge (Escape)', exact: true }).count() > 0;
  // Windows Chromium can resize only while its native window is normal.
  if (alreadyFullscreen) await page.getByRole('button', { name: 'Exit fullscreen 3D bridge (Escape)', exact: true }).click();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true);
  await expect(page.getByRole('button', { name: 'View the 3D bridge fullscreen', exact: true })).toBeVisible();
  const height = await frame.evaluate(node => node.getBoundingClientRect().height);
  await page.setViewportSize({ width: viewport.width, height: Math.max(viewport.height, 1200, Math.ceil(height) + 250) });
  await page.getByRole('button', { name: 'View the 3D bridge fullscreen', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Exit fullscreen 3D bridge (Escape)', exact: true })).toBeVisible();
  await frame.scrollIntoViewIfNeeded();
  const bounds = await frame.evaluate(node => {
    node.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
    const box = node.getBoundingClientRect(), panel = node.closest('[data-bridge-scene-readout]')!.getBoundingClientRect();
    return { top: box.top, bottom: box.bottom, panelTop: panel.top, panelBottom: panel.bottom };
  });
  expect(bounds.top, 'capture contains the top of the native evidence').toBeGreaterThanOrEqual(bounds.panelTop + 2);
  expect(bounds.bottom, 'capture contains the bottom of the native evidence').toBeLessThanOrEqual(bounds.panelBottom - 2);
  const destination = process.env.BRIDGE_CAPTURE_REPORT || ENHANCEMENT_REPORT;
  await mkdir(destination, { recursive: true });
  await frame.screenshot({ path: join(destination, name) });
  await page.getByRole('button', { name: 'Exit fullscreen 3D bridge (Escape)', exact: true }).click();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true);
  await expect(page.getByRole('button', { name: 'View the 3D bridge fullscreen', exact: true })).toBeVisible();
  await page.setViewportSize(viewport);
  if (alreadyFullscreen) {
    await page.getByRole('button', { name: 'View the 3D bridge fullscreen', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Exit fullscreen 3D bridge (Escape)', exact: true })).toBeVisible();
  }
  expect(await state(), 'capture and resizing preserve the selected frame and raw powers').toEqual(before);
}

type FrameEnergyPart = 'kinetic' | 'elastic' | 'dissipated';

function frameEnergyNumber(value: number) {
  return value === 0 ? '0.000' : Math.abs(value) < 0.001 ? value.toExponential(2) : value.toFixed(3);
}

// Responses are immutable oracle records. Cache by every input field, then
// sample the requested time independently on each check; peaks use the same record.
const frameEnergyResponses = new WeakMap<GuideEnergyOracle, Map<string, any>>();

// The three frame-energy scenarios share one frozen source oracle in this worker.
// Its response/sample functions and the evidence helpers never mutate records.
let frameEnergyOraclePromise: Promise<GuideEnergyOracle> | undefined;
function loadFrameEnergyOracle(): Promise<GuideEnergyOracle> {
  if (!frameEnergyOraclePromise) frameEnergyOraclePromise = loadGuideEnergyOracle();
  return frameEnergyOraclePromise;
}

type SceneMomentId = 'start' | 'motion' | 'acceleration' | 'free' | 'end';

function momentPrecisionExpected(oracle: GuideEnergyOracle, inputs: GuideInputs, id: SceneMomentId) {
  let responses = frameEnergyResponses.get(oracle);
  if (!responses) { responses = new Map(); frameEnergyResponses.set(oracle, responses); }
  const key = JSON.stringify(Object.keys(inputs).sort().map(name => [name, inputs[name]]));
  if (!responses.has(key)) responses.set(key, oracle.bridgeSeismicResponse(inputs));
  const response = responses.get(key);
  // The oracle supplies recorded milestones and samples independently of the
  // option metadata and the displayed reading. No DOM value feeds this sample.
  const time = id === 'motion' ? response.milestones.peakMotionS
    : id === 'acceleration' ? response.milestones.peakAccelerationS
    : id === 'free' ? response.milestones.freeVibrationS : id === 'end' ? response.durationS : 0;
  const point = oracle.bridgeSeismicSample(response, time);
  const value = id === 'motion' ? Math.abs(point.relativeM * 100)
    : id === 'acceleration' ? Math.abs(point.absoluteAccelerationMps2) / 9.80665 : point.storedJPerKg;
  const kinetic = point.velocityMps * point.velocityMps / 2;
  const elasticCoordinate = 2 * Math.PI * response.naturalFrequencyHz * point.relativeM;
  const elastic = elasticCoordinate * elasticCoordinate / 2;
  const energyScientific = (id === 'motion' || id === 'acceleration')
    && [kinetic, elastic, kinetic + elastic].some(value => value !== 0 && Math.abs(value) < 0.001);
  return { time, value, energyScientific, unit: id === 'motion' ? 'cm' : id === 'acceleration' ? 'g' : 'J/kg',
    quantity: id === 'motion' ? 'relativeMotion' : id === 'acceleration' ? 'absoluteAcceleration' : 'storedEnergy' };
}

async function checkMomentPrecision(page: Pg, oracle: GuideEnergyOracle, inputs: GuideInputs,
  id: SceneMomentId, trial: 'reference' | 'current' = 'current') {
  const expected = momentPrecisionExpected(oracle, inputs, id);
  const select = page.getByRole('combobox', { name: 'Scene key moments', exact: true });
  const insight = page.locator('[data-bridge-moment-insight="' + id + '"]');
  await expect(select.locator('option[value="' + id + '"]')).toHaveAttribute('data-moment-time', String(expected.time));
  await expect(select).toHaveValue(id);
  await expect(insight).toHaveCount(1);
  await expect(insight).toBeVisible();
  const evidence = await insight.evaluate(node => {
    const readings = node.querySelectorAll('[data-moment-reading]'), reading = readings[0] as HTMLElement | undefined;
    const help = node.querySelectorAll('[data-moment-scientific-help]');
    const select = document.querySelector('select[aria-label="Scene key moments"]');
    return { id: node.id, time: node.getAttribute('data-moment-time'), trial: node.getAttribute('data-moment-trial'),
      describedBy: select?.getAttribute('aria-describedby'), live: node.closest('[data-bridge-scene-readout]')?.getAttribute('aria-live'),
      reading: { count: readings.length, raw: reading?.getAttribute('data-moment-value') ?? null,
        unit: reading?.getAttribute('data-moment-unit'), quantity: reading?.getAttribute('data-moment-quantity'),
        text: reading?.textContent ?? '', native: reading ? !reading.closest('svg,[aria-hidden="true"]') : false,
        tag: reading?.tagName, fontSize: reading ? parseFloat(getComputedStyle(reading).fontSize) : null,
        overflow: reading ? reading.scrollWidth - reading.clientWidth : null },
      help: { count: help.length, text: help[0]?.textContent ?? '' }, overflow: node.scrollWidth - node.clientWidth,
      fonts: [...node.querySelectorAll('strong,p')].map(element => parseFloat(getComputedStyle(element).fontSize)) };
  });
  expect(evidence.time).toBe(String(expected.time));
  expect(evidence.trial).toBe(trial);
  expect(evidence.describedBy, 'the moment selector describes the exact visible insight').toBe(evidence.id);
  expect(evidence.live).toBe('off');
  expect(evidence.reading.count).toBe(1);
  expect(evidence.reading.raw).not.toBeNull();
  const value = Number(evidence.reading.raw);
  if (expected.value === 0) expect(value, 'a true zero remains exactly zero').toBe(0);
  else expect(Math.abs(value - expected.value), 'the value comes from this selected trial and recorded milestone')
    .toBeLessThanOrEqual(expected.value * 2e-10);
  expect(evidence.reading.unit).toBe(expected.unit);
  expect(evidence.reading.quantity).toBe(expected.quantity);
  expect(evidence.reading.text).toBe(frameEnergyNumber(expected.value) + ' ' + expected.unit);
  expect(evidence.reading.native, 'the reading is visible native text').toBe(true);
  expect(evidence.reading.tag).toBe('STRONG');
  expect(evidence.reading.fontSize).toBeGreaterThanOrEqual(11);
  expect(evidence.fonts.every(size => size >= 11), 'the explanation remains readable at phone width').toBe(true);
  expect(evidence.reading.overflow).toBeLessThanOrEqual(1);
  expect(evidence.overflow).toBeLessThanOrEqual(1);
  const scientific = expected.value !== 0 && Math.abs(expected.value) < 0.001;
  expect(evidence.help.count).toBe(scientific || expected.energyScientific ? 1 : 0);
  if (scientific) {
    expect(value).toBeGreaterThan(0);
    expect(evidence.reading.text).toMatch(/e-\d+/);
    expect(evidence.help.text).toContain('2.5e-6 means 0.0000025');
  }
  expect(await page.evaluate(() => {
    const bucket = (window as any).__bucket();
    return { time: bucket.seismicTime, playing: bucket.seismicPlaying, driving: bucket.autoDriving };
  })).toEqual({ time: expected.time, playing: false, driving: false });
  return { id, trial, time: expected.time, value, unit: expected.unit, quantity: expected.quantity,
    text: evidence.reading.text, scientific };
}

async function checkMomentPrecisionReachability(insight: import('@playwright/test').Locator) {
  const targets = [insight.locator('[data-moment-reading]'), ...await insight.locator('p').all()];
  for (const target of targets) {
    const bounds = await target.evaluate(node => {
      node.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
      const panel = node.closest('[data-bridge-scene-readout]') as HTMLElement;
      if (!panel) throw Error('Moment insight lacks its scene panel');
      let box = node.getBoundingClientRect(), parent = panel.getBoundingClientRect();
      if (box.top < parent.top + 2) panel.scrollTop -= parent.top + 2 - box.top + 8;
      if (box.bottom > parent.bottom - 2) panel.scrollTop += box.bottom - parent.bottom + 10;
      box = node.getBoundingClientRect(); parent = panel.getBoundingClientRect();
      return { top: box.top, bottom: box.bottom, panelTop: parent.top, panelBottom: parent.bottom,
        overflow: node.scrollWidth - node.clientWidth };
    });
    expect(bounds.top, 'each moment reading and explanation clears the native panel top').toBeGreaterThanOrEqual(bounds.panelTop + 2);
    expect(bounds.bottom, 'each moment reading and explanation is reachable above the panel bottom').toBeLessThanOrEqual(bounds.panelBottom - 2);
    expect(bounds.overflow).toBeLessThanOrEqual(1);
  }
}

async function captureMomentPrecision(page: Pg, insight: import('@playwright/test').Locator, name: string) {
  // First exercise the ordinary-height native scroll. A taller real fullscreen
  // viewport then captures the complete insight without changing its phone width.
  await checkMomentPrecisionReachability(insight);
  const viewport = page.viewportSize()!;
  async function snapshot() {
    return insight.evaluate(node => ({ time: node.getAttribute('data-moment-time'), trial: node.getAttribute('data-moment-trial'),
      reading: [...node.querySelectorAll('[data-moment-reading]')].map(reading => ({
        value: reading.getAttribute('data-moment-value'), unit: reading.getAttribute('data-moment-unit'),
        quantity: reading.getAttribute('data-moment-quantity'), text: reading.textContent })) }));
  }
  const before = await snapshot();
  const alreadyFullscreen = await page.getByRole('button', { name: 'Exit fullscreen 3D bridge (Escape)', exact: true }).count() > 0;
  if (alreadyFullscreen) await page.getByRole('button', { name: 'Exit fullscreen 3D bridge (Escape)', exact: true }).click();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true);
  await expect(page.getByRole('button', { name: 'View the 3D bridge fullscreen', exact: true })).toBeVisible();
  const height = await insight.evaluate(node => node.getBoundingClientRect().height);
  await page.setViewportSize({ width: viewport.width, height: Math.max(viewport.height, 1200, Math.ceil(height) + 250) });
  await page.getByRole('button', { name: 'View the 3D bridge fullscreen', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Exit fullscreen 3D bridge (Escape)', exact: true })).toBeVisible();
  const bounds = await insight.evaluate(node => {
    node.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
    const box = node.getBoundingClientRect(), panel = node.closest('[data-bridge-scene-readout]')!.getBoundingClientRect();
    return { top: box.top, bottom: box.bottom, panelTop: panel.top, panelBottom: panel.bottom };
  });
  expect(bounds.top, 'the image contains the complete insight top').toBeGreaterThanOrEqual(bounds.panelTop + 2);
  expect(bounds.bottom, 'the image contains the complete insight bottom').toBeLessThanOrEqual(bounds.panelBottom - 2);
  const destination = process.env.BRIDGE_CAPTURE_REPORT || ENHANCEMENT_REPORT;
  await mkdir(destination, { recursive: true });
  await insight.screenshot({ path: join(destination, name) });
  await page.getByRole('button', { name: 'Exit fullscreen 3D bridge (Escape)', exact: true }).click();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true);
  await expect(page.getByRole('button', { name: 'View the 3D bridge fullscreen', exact: true })).toBeVisible();
  await page.setViewportSize(viewport);
  if (alreadyFullscreen) {
    await page.getByRole('button', { name: 'View the 3D bridge fullscreen', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Exit fullscreen 3D bridge (Escape)', exact: true })).toBeVisible();
  }
  expect(await snapshot(), 'capture preserves the selected trial, milestone and exact numerical reading').toEqual(before);
}


async function checkSceneEnergyAmounts(
  frame: import('@playwright/test').Locator,
  oracle: GuideEnergyOracle,
  inputs: GuideInputs,
  time: number,
  scaleInputs: GuideInputs[] = [inputs]
) {
  await expect(frame).toHaveAttribute('data-bridge-scene-energy-frame', String(time));
  await expect(frame).toHaveAttribute('aria-live', 'off');
  let responses = frameEnergyResponses.get(oracle);
  if (!responses) { responses = new Map(); frameEnergyResponses.set(oracle, responses); }
  function response(input: GuideInputs) {
    const key = JSON.stringify(Object.keys(input).sort().map(name => [name, input[name]]));
    if (!responses!.has(key)) responses!.set(key, oracle.bridgeSeismicResponse(input));
    return responses!.get(key);
  }
  const point = oracle.bridgeSeismicSample(response(inputs), time);
  const amounts: Record<FrameEnergyPart, number> = {
    kinetic: point.kineticJPerKg, elastic: point.strainJPerKg, dissipated: point.dissipatedJPerKg
  };
  const expectedLimit = Math.max(...scaleInputs.map(input => {
    const peaks = response(input).peaks;
    return Math.max(0.001, peaks.inputJPerKg, peaks.storedJPerKg, peaks.dissipatedJPerKg) * 1.04;
  }));
  // Capture one coherent DOM frame. Assertions below keep each numerical and
  // accessibility check while avoiding hundreds of browser protocol round trips.
  const expectedWidths: Record<FrameEnergyPart, number> = {
    kinetic: amounts.kinetic / expectedLimit * 100,
    elastic: amounts.elastic / expectedLimit * 100,
    dissipated: amounts.dissipated / expectedLimit * 100
  };
  const evidence = await frame.evaluate((node, expectedPercentages) => {
    function matching(selector: string) { return Array.from(node.querySelectorAll(selector)); }
    function text(selector: string) {
      const nodes = matching(selector), element = nodes[0] as HTMLElement | undefined;
      return { count: nodes.length, value: element?.getAttribute('data-energy-value') ?? null,
        text: element?.textContent ?? '', native: element ? !element.closest('svg,[aria-hidden="true"]') : false,
        fontSize: element ? parseFloat(getComputedStyle(element).fontSize) : null };
    }
    const parts = Object.fromEntries(['kinetic', 'elastic', 'dissipated'].map(id => {
      const nodes = matching('[data-scene-energy-part="' + id + '"]'), element = nodes[0] as HTMLElement | undefined;
      // Normalize the independent oracle percentage through this browser's CSSOM.
      // Tiny percentages can serialize with fewer digits than the authored number.
      const expectedStyle = document.createElement('span').style;
      expectedStyle.width = expectedPercentages[id as FrameEnergyPart] + '%';
      return [id, { count: nodes.length, value: element?.getAttribute('data-energy-value') ?? null,
        width: element ? parseFloat(element.style.width) : null, expectedWidth: parseFloat(expectedStyle.width),
        minWidth: element?.style.minWidth ?? null,
        pattern: element ? getComputedStyle(element).backgroundImage : null,
        renderedWidth: element ? element.getBoundingClientRect().width : null }];
    }));
    const groups = matching('[data-scene-energy-group]');
    const stored = matching('[data-scene-energy-group="stored"]');
    const dissipated = matching('[data-scene-energy-group="dissipated"]');
    function partIds(element: Element | undefined) {
      return element ? Array.from(element.querySelectorAll('[data-scene-energy-part]'))
        .map(part => part.getAttribute('data-scene-energy-part')) : [];
    }
    const scale = matching('[data-scene-energy-scale]');
    const scientific = matching('[data-scene-energy-scientific-help]');
    return { time: node.getAttribute('data-bridge-scene-energy-frame'), live: node.getAttribute('aria-live'),
      limit: node.getAttribute('data-energy-limit'), parts,
      groups: { count: groups.length, storedCount: stored.length, dissipatedCount: dissipated.length,
        storedParts: partIds(stored[0]), dissipatedParts: partIds(dissipated[0]) },
      totals: { stored: text('[data-scene-energy-total="stored"]'), dissipated: text('[data-scene-energy-total="dissipated"]') },
      readings: { kinetic: text('[data-scene-energy-reading="kinetic"]'), elastic: text('[data-scene-energy-reading="elastic"]') },
      caption: text('[data-scene-energy-caption]'), scale: { count: scale.length,
        value: scale[0]?.getAttribute('data-scene-energy-scale') ?? null, text: scale[0]?.textContent ?? '' },
      units: text('[data-scene-energy-units]'), scientific: { count: scientific.length,
        text: scientific[0]?.textContent ?? '' }, overflow: node.scrollWidth - node.clientWidth };
  }, expectedWidths);
  expect(evidence.time).toBe(String(time));
  expect(evidence.live).toBe('off');
  const limit = Number(evidence.limit);
  expect(Math.abs(limit - expectedLimit), 'the frame keeps the existing event or paired energy scale')
    .toBeLessThanOrEqual(expectedLimit * 2e-10);
  const tolerance = Math.max(...Object.values(amounts), point.storedJPerKg) * 2e-10;
  expect(evidence.groups.count).toBe(2);
  expect(evidence.groups.storedCount).toBe(1);
  expect(evidence.groups.dissipatedCount).toBe(1);
  expect(evidence.groups.storedParts).toEqual(['kinetic', 'elastic']);
  expect(evidence.groups.dissipatedParts).toEqual(['dissipated']);
  const values: Record<string, number> = {}, widths: Record<string, number> = {};
  for (const id of ['kinetic', 'elastic', 'dissipated'] as FrameEnergyPart[]) {
    const geometry = evidence.parts[id];
    expect(geometry.count, id + ' has exactly one amount bar').toBe(1);
    expect(geometry.value, id + ' retains its raw recorded amount').not.toBeNull();
    const value = Number(geometry.value);
    if (amounts[id] === 0) expect(value, id + ' retains true zero').toBe(0);
    else expect(Math.abs(value - amounts[id]), id + ' uses the recorded interpolated amount').toBeLessThanOrEqual(tolerance);
    values[id] = value;
    const expectedWidth = geometry.expectedWidth;
    if (amounts[id] === 0) {
      expect(expectedWidth).toBe(0);
      expect(geometry.width).toBe(0);
    } else {
      expect(expectedWidth, id + ' keeps its nonzero oracle percentage after CSSOM serialization').toBeGreaterThan(0);
      expect(Math.abs(geometry.width! - expectedWidth), id + ' uses the oracle scale after CSSOM serialization without a minimum visible segment')
        .toBeLessThanOrEqual(expectedWidth * 2e-5);
    }
    expect(['', '0', '0px']).toContain(geometry.minWidth);
    if (value === 0) expect(geometry.renderedWidth).toBe(0);
    if (id === 'elastic') expect(geometry.pattern).toBe('none');
    else expect(geometry.pattern, id + ' retains a non-color visual pattern').toContain('linear-gradient');
    widths[id] = geometry.width!;
  }
  const totals: Record<string, number> = {};
  for (const [id, expected] of [['stored', point.storedJPerKg], ['dissipated', point.dissipatedJPerKg]] as const) {
    const reading = evidence.totals[id];
    expect(reading.count).toBe(1);
    expect(reading.value).not.toBeNull();
    const value = Number(reading.value);
    if (expected === 0) expect(value).toBe(0);
    else expect(Math.abs(value - expected), id + ' total comes from the selected frame').toBeLessThanOrEqual(tolerance);
    expect(reading.text).toContain(frameEnergyNumber(expected) + ' J/kg');
    expect(reading.native, id + ' total is native visible text').toBe(true);
    expect(reading.fontSize, id + ' total remains readable on phones').toBeGreaterThanOrEqual(11);
    totals[id] = value;
  }
  expect(Math.abs(totals.stored - values.kinetic - values.elastic)).toBeLessThanOrEqual(tolerance);
  for (const id of ['kinetic', 'elastic'] as const) {
    const reading = evidence.readings[id];
    expect(reading.count).toBe(1);
    expect(reading.value).not.toBeNull();
    expect(Number(reading.value)).toBe(values[id]);
    expect(reading.text).toContain(id === 'kinetic' ? 'Kinetic' : 'Elastic');
    expect(reading.text).toContain(frameEnergyNumber(amounts[id]) + ' J/kg');
    expect(reading.native).toBe(true);
  }
  expect(evidence.caption.count).toBe(1);
  expect(evidence.caption.text).toContain(time.toFixed(2));
  expect(evidence.scale.count).toBe(1);
  expect(evidence.scale.text).toContain(frameEnergyNumber(limit) + ' J/kg');
  expect(Number(evidence.scale.value)).toBe(limit);
  expect(evidence.units.count).toBe(1);
  expect(evidence.units.text).toContain('J/kg');
  expect(evidence.units.text).toContain('W/kg');
  expect(evidence.units.text).toMatch(/each second|per second/);
  const scientific = [...Object.values(amounts), point.storedJPerKg].some(value => value !== 0 && Math.abs(value) < 0.001);
  expect(evidence.scientific.count).toBe(scientific ? 1 : 0);
  if (scientific) expect(evidence.scientific.text).toContain('2.5e-6 means 0.0000025');
  expect(evidence.overflow, 'the amount snapshot stays within its panel').toBeLessThanOrEqual(1);
  return { values, totals, widths, limit };
}

async function checkSceneEnergyReachability(page: Pg, frame: import('@playwright/test').Locator) {
  for (const selector of ['[data-scene-energy-total="stored"]', '[data-scene-energy-reading="kinetic"]',
    '[data-scene-energy-reading="elastic"]', '[data-scene-energy-total="dissipated"]', '[data-scene-energy-units]']) {
    const reading = frame.locator(selector);
    await reading.evaluate(node => node.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }));
    const bounds = await reading.evaluate(node => {
      const panel = node.closest('[data-bridge-scene-readout]') as HTMLElement;
      if (!panel) throw new Error('Amount reading lacks its scene panel');
      let box = node.getBoundingClientRect(), parent = panel.getBoundingClientRect();
      if (box.top < parent.top + 2) panel.scrollTop -= parent.top + 2 - box.top + 8;
      if (box.bottom > parent.bottom - 2) panel.scrollTop += box.bottom - parent.bottom + 10;
      box = node.getBoundingClientRect(); parent = panel.getBoundingClientRect();
      return { top: box.top, bottom: box.bottom, panelTop: parent.top, panelBottom: parent.bottom,
        overflow: node.scrollWidth - node.clientWidth };
    });
    expect(bounds.top, selector + ' clears the native scroll panel top').toBeGreaterThanOrEqual(bounds.panelTop + 2);
    expect(bounds.bottom, selector + ' is reachable in the ordinary panel').toBeLessThanOrEqual(bounds.panelBottom - 2);
    expect(bounds.overflow, selector + ' wraps at phone width').toBeLessThanOrEqual(1);
  }
  const separation = await page.locator('[data-bridge-scene-readout]').evaluate(node => {
    const replay = document.querySelector('[data-bridge-scene-replay]')!;
    return replay.getBoundingClientRect().top - node.getBoundingClientRect().bottom;
  });
  expect(separation, 'the energy snapshot leaves replay controls clear').toBeGreaterThanOrEqual(4);
}

async function captureSceneEnergyAmounts(page: Pg, frame: import('@playwright/test').Locator, name: string) {
  await checkSceneEnergyReachability(page, frame);
  const viewport = page.viewportSize()!;
  async function snapshot() {
    return frame.evaluate(node => ({ time: node.getAttribute('data-bridge-scene-energy-frame'),
      trial: node.getAttribute('data-energy-trial'), limit: node.getAttribute('data-energy-limit'),
      amounts: [...node.querySelectorAll('[data-scene-energy-part],[data-scene-energy-total]')]
        .map(part => [part.getAttribute('data-scene-energy-part') || part.getAttribute('data-scene-energy-total'), part.getAttribute('data-energy-value')]) }));
  }
  const before = await snapshot();
  const alreadyFullscreen = await page.getByRole('button', { name: 'Exit fullscreen 3D bridge (Escape)', exact: true }).count() > 0;
  // Resize the native window only while normal; Windows Chromium cannot resize
  // a fullscreen window. Preserve the phone panel width in the complete image.
  if (alreadyFullscreen) await page.getByRole('button', { name: 'Exit fullscreen 3D bridge (Escape)', exact: true }).click();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true);
  await expect(page.getByRole('button', { name: 'View the 3D bridge fullscreen', exact: true })).toBeVisible();
  const height = await frame.evaluate(node => node.getBoundingClientRect().height);
  await page.setViewportSize({ width: viewport.width, height: Math.max(viewport.height, 1200, Math.ceil(height) + 250) });
  await page.getByRole('button', { name: 'View the 3D bridge fullscreen', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Exit fullscreen 3D bridge (Escape)', exact: true })).toBeVisible();
  await frame.scrollIntoViewIfNeeded();
  const bounds = await frame.evaluate(node => {
    node.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
    const box = node.getBoundingClientRect(), panel = node.closest('[data-bridge-scene-readout]')!.getBoundingClientRect();
    return { top: box.top, bottom: box.bottom, panelTop: panel.top, panelBottom: panel.bottom };
  });
  expect(bounds.top).toBeGreaterThanOrEqual(bounds.panelTop + 2);
  expect(bounds.bottom).toBeLessThanOrEqual(bounds.panelBottom - 2);
  const destination = process.env.BRIDGE_CAPTURE_REPORT || ENHANCEMENT_REPORT;
  await mkdir(destination, { recursive: true });
  await frame.screenshot({ path: join(destination, name) });
  await page.getByRole('button', { name: 'Exit fullscreen 3D bridge (Escape)', exact: true }).click();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true);
  await expect(page.getByRole('button', { name: 'View the 3D bridge fullscreen', exact: true })).toBeVisible();
  await page.setViewportSize(viewport);
  if (alreadyFullscreen) {
    await page.getByRole('button', { name: 'View the 3D bridge fullscreen', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Exit fullscreen 3D bridge (Escape)', exact: true })).toBeVisible();
  }
  expect(await snapshot(), 'fullscreen and resizing preserve the selected energy amounts').toEqual(before);
}

async function checkCurrentEnergyAmountMap(page: Pg, oracle: GuideEnergyOracle, inputs: GuideInputs, time: number) {
  const map = page.locator('[data-seismic-energy-map="current"]');
  await expect(map).toHaveAttribute('data-energy-map-time', String(time));
  await expect(map.locator('[data-energy-map-caption]')).toContainText('Current experiment · ' + time.toFixed(3) + ' s');
  const point = oracle.bridgeSeismicSample(oracle.bridgeSeismicResponse(inputs), time);
  const expected = { stored: point.storedJPerKg, dissipated: point.dissipatedJPerKg,
    kinetic: point.kineticJPerKg, elastic: point.strainJPerKg };
  const tolerance = Math.max(...Object.values(expected)) * 2e-10;
  const values: Record<string, number> = {};
  for (const [id, value] of Object.entries(expected)) {
    const selector = id === 'stored' ? '[data-energy-map-amount="stored"]'
      : id === 'dissipated' ? '[data-energy-map-amount="damping"]' : '[data-energy-map-detail="' + id + '"]';
    const reading = map.locator(selector);
    const actual = Number(await reading.getAttribute('data-energy-value'));
    if (value === 0) expect(actual).toBe(0);
    else expect(Math.abs(actual - value)).toBeLessThanOrEqual(tolerance);
    await expect(reading).toContainText(frameEnergyNumber(value));
    values[id] = actual;
  }
  return values;
}

async function flowCurrentInputs(page: Pg): Promise<GuideInputs> {
  return page.evaluate(() => {
    const bucket = (window as any).__bucket();
    return { archetype: bucket.seismicArchetype || 'balanced', groundFrequencyHz: bucket.seismicFrequencyHz ?? 1.1,
      intensityG: bucket.seismicIntensityG ?? 0.12, dampingRatio: bucket.seismicDampingRatio ?? 0.05 };
  });
}

async function checkMotionPositionDiagram(frame: import('@playwright/test').Locator) {
  const figure = frame.locator('[data-motion-position-diagram]');
  const svg = figure.locator('[data-motion-position-svg]');
  await expect(figure).toHaveAttribute('data-motion-position-diagram', (await frame.getAttribute('data-motion-frame'))!);
  await expect(figure.locator(':scope > figcaption')).toHaveText('Across the bridge · position diagram');
  await expect(figure.locator('[data-motion-position-labels]')).toHaveText('Deck · diamondGround · circle');
  await expect(figure.locator('[data-motion-position-scope]')).toContainText('Shapes do not show member deformation or damage.');
  expect(await figure.locator('figcaption,[data-motion-position-labels],[data-motion-position-scope]')
    .evaluateAll(nodes => nodes.every(node => !node.closest('svg')))).toBe(true);
  await expect(svg).toHaveAttribute('aria-hidden', 'true');
  await expect(svg).toHaveAttribute('focusable', 'false');
  await expect(svg).toHaveAttribute('viewBox', '0 0 400 104');
  await expect(svg).toHaveAttribute('preserveAspectRatio', 'none');
  await expect(svg.locator('text')).toHaveCount(0);
  const readings = await frame.locator('[data-motion-reading]').evaluateAll(nodes =>
    Object.fromEntries(nodes.map(node => [node.getAttribute('data-motion-reading')!, Number(node.getAttribute('data-motion-value-m'))])));
  const range = Number(await frame.getAttribute('data-motion-range-m'));
  expect(Number.isFinite(range)).toBe(true);
  expect(range).toBeGreaterThan(0);
  expect(Object.values(readings).every(Number.isFinite)).toBe(true);
  // The expected positions come from the numerical readings and shared range,
  // independently of the diagram's data attributes and transform strings.
  const expectedX = { deck: 200 + readings.deck / range * 160, ground: 200 + readings.ground / range * 160 };
  const geometry = await svg.evaluate(element => {
    const root = element as SVGSVGElement, matrix = root.getScreenCTM()!;
    const bodies = ['deck', 'ground'].map(id => {
      const group = root.querySelector('[data-motion-position-body="' + id + '"]') as SVGGElement;
      const slab = group.querySelector('rect') as SVGRectElement;
      const resting = root.querySelector('[data-motion-resting-shape="' + id + '"]') as SVGRectElement;
      const projection = root.querySelector('[data-motion-position-projection="' + id + '"]') as SVGLineElement;
      const bodyMatrix = group.transform.baseVal.consolidate()!.matrix;
      const box = slab.getBoundingClientRect(), restBox = resting.getBoundingClientRect();
      const p = projection.getBoundingClientRect();
      return { id, percent: Number(group.getAttribute('data-motion-position-percent')),
        translate: [bodyMatrix.a, bodyMatrix.b, bodyMatrix.c, bodyMatrix.d, bodyMatrix.e, bodyMatrix.f],
        slab: [slab.x.baseVal.value, slab.y.baseVal.value, slab.width.baseVal.value, slab.height.baseVal.value],
        resting: [resting.x.baseVal.value, resting.y.baseVal.value, resting.width.baseVal.value, resting.height.baseVal.value],
        centerPx: box.x + box.width / 2, widthPx: box.width, restCenterPx: restBox.x + restBox.width / 2,
        projection: [projection.x1.baseVal.value, projection.x2.baseVal.value, projection.y1.baseVal.value, projection.y2.baseVal.value],
        projectionPx: p.x };
    });
    const line = root.querySelector('[data-motion-position-gap]') as SVGLineElement | null;
    const rest = root.querySelector('[data-motion-position-rest]') as SVGLineElement;
    const frame = root.closest('[data-motion-frame]') as HTMLElement;
    return { bodies, rest: [rest.x1.baseVal.value, rest.x2.baseVal.value],
      matrix: { a: matrix.a, d: matrix.d, e: matrix.e, f: matrix.f },
      width: root.getBoundingClientRect().width, frameWidth: frame.getBoundingClientRect().width,
      gap: line ? { value: Number(line.getAttribute('data-motion-relative-m')),
        endpoints: [line.x1.baseVal.value, line.x2.baseVal.value, line.y1.baseVal.value, line.y2.baseVal.value],
        width: line.getBBox().width, screenWidth: line.getBoundingClientRect().width,
        stroke: getComputedStyle(line).stroke, markers: [line.getAttribute('marker-start'), line.getAttribute('marker-end')] } : null };
  });
  expect(geometry.rest).toEqual([200, 200]);
  expect(geometry.width).toBeGreaterThan(0);
  expect(geometry.width).toBeLessThanOrEqual(geometry.frameWidth + 1);
  expect(geometry.matrix.a).toBeGreaterThan(0);
  expect(geometry.matrix.d).toBeGreaterThan(0);
  for (const body of geometry.bodies) {
    const id = body.id as 'deck' | 'ground', x = expectedX[id], y = id === 'deck' ? 16 : 56;
    expect(body.percent).toBeCloseTo(x / 4, 11);
    expect(body.translate.slice(0, 4)).toEqual([1, 0, 0, 1]);
    // SVG animated lengths and transform matrices use float precision.
    expect(body.translate[4]).toBeCloseTo(x, 4);
    expect(body.translate[5]).toBe(0);
    expect(body.slab).toEqual([-28, y, 56, 12]);
    expect(body.resting).toEqual([172, y, 56, 12]);
    expect(body.centerPx).toBeCloseTo(geometry.matrix.e + geometry.matrix.a * x, 4);
    expect(body.widthPx).toBeCloseTo(geometry.matrix.a * 56, 4);
    expect(body.restCenterPx).toBeCloseTo(geometry.matrix.e + geometry.matrix.a * 200, 4);
    expect(body.projection[0]).toBeCloseTo(x, 4);
    expect(body.projection[1]).toBeCloseTo(x, 4);
    expect(body.projection.slice(2)).toEqual([id === 'deck' ? 34 : 74, 90]);
    expect(body.projectionPx).toBeCloseTo(geometry.matrix.e + geometry.matrix.a * x, 4);
  }
  // Keep the circle and diamond legible at phone width while their centers
  // continue to use the exact shared position scale of the primary SVG.
  await expect(figure.locator('[data-motion-position-glyph]')).toHaveCount(2);
  for (const id of ['deck', 'ground'] as const) {
    const glyph = figure.locator('[data-motion-position-glyph="' + id + '"]');
    await expect(glyph).toHaveAttribute('aria-hidden', 'true');
    await expect(glyph).toHaveAttribute('focusable', 'false');
    await expect(glyph).toHaveAttribute('viewBox', '0 0 16 16');
    await expect(glyph).toHaveAttribute('width', '16');
    await expect(glyph).toHaveAttribute('height', '16');
    const bounds = await glyph.evaluate(node => {
      const element = node as SVGSVGElement;
      const shape = element.querySelector('circle,path') as SVGGraphicsElement;
      const box = element.getBoundingClientRect(), shapeBox = shape.getBoundingClientRect();
      const drawing = shape.getBBox();
      return { width: box.width, height: box.height, centerX: box.x + box.width / 2, centerY: box.y + box.height / 2,
        shapeWidth: shapeBox.width, shapeHeight: shapeBox.height, shape: [drawing.x, drawing.y, drawing.width, drawing.height],
        primarySvg: !!element.closest('[data-motion-position-svg]') };
    });
    expect(bounds.primarySvg, 'fixed glyphs use their own square viewport').toBe(false);
    expect(bounds.width).toBeCloseTo(16, 4);
    expect(bounds.height).toBeCloseTo(16, 4);
    expect(bounds.shape).toEqual([2, 2, 12, 12]);
    expect(bounds.shapeWidth).toBeCloseTo(12, 4);
    expect(bounds.shapeHeight).toBeCloseTo(12, 4);
    expect(bounds.shapeWidth / bounds.shapeHeight).toBeCloseTo(1, 4);
    // CSS percentage positioning is quantized to layout pixels, unlike SVG
    // coordinates. This bound is below one fiftieth of a CSS pixel.
    expect(Math.abs(bounds.centerX - (geometry.matrix.e + geometry.matrix.a * expectedX[id]))).toBeLessThanOrEqual(0.02);
    expect(Math.abs(bounds.centerY - (geometry.matrix.f + geometry.matrix.d * (id === 'deck' ? 22 : 62)))).toBeLessThanOrEqual(0.02);
  }
  const width = Math.abs(expectedX.deck - expectedX.ground);
  if (readings.relative === 0) {
    expect(geometry.gap, 'exact zero creates no apparent separation').toBeNull();
    expect(expectedX.deck).toBe(expectedX.ground);
  } else {
    expect(geometry.gap).not.toBeNull();
    expect(geometry.gap!.value).toBe(readings.relative);
    expect(geometry.gap!.endpoints[0]).toBeCloseTo(expectedX.ground, 4);
    expect(geometry.gap!.endpoints[1]).toBeCloseTo(expectedX.deck, 4);
    expect(geometry.gap!.endpoints.slice(2)).toEqual([90, 90]);
    expect(geometry.gap!.width).toBeCloseTo(width, 4);
    expect(geometry.gap!.screenWidth).toBeCloseTo(width * geometry.matrix.a, 4);
    expect(geometry.gap!.stroke).toBe('rgb(248, 250, 252)');
    expect(geometry.gap!.markers).toEqual([null, null]);
  }
  return { readings, range, x: expectedX, gapWidth: width };
}

test.describe.configure({ timeout: 180_000 });

test.describe('Bridge Lab — real WebGL', () => {
  test.afterEach(async ({ page }) => {
    await page.evaluate(() => { try { (window as any).__destroy(); } catch { /* gone */ } }).catch(() => {});
  });

  // The 320px pass taps the lanes, and Playwright refuses tap() in a context without touch.
  test.describe('cycle tap', () => {
  test.use({ hasTouch: true });
  for (const width of [1280, 320]) {
    test('cycle tap: direct event exploration preserves evidence at ' + width + 'px', async ({ page }) => {
      test.setTimeout(180_000);
      const report = process.env.BRIDGE_CAPTURE_REPORT || ENHANCEMENT_REPORT;
      await mkdir(report, { recursive: true });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await mountWorkflow(page, width, { bridgeView: 'immersive', bridgeObserver: 'bank', seismicEnabled: true,
        seismicGuideOpen: true, seismicEnergyOrbit: true, seismicEnergyInterval: true,
        seismicIntervalPinS: 19.117, seismicTime: 19.417, seismicPlaying: false, autoDriving: false,
        bridgeBankYaw: 18, seismicSceneNote: 'Keep my direct inspection.' });
      await page.getByRole('button', { name: 'From the riverbank', exact: true }).click();
      await page.getByRole('button', { name: 'Prepare 5% / 20% comparison', exact: true }).click();
      await page.getByRole('button', { name: 'A · reference', exact: true }).click();
      const oracle = await loadFrameEnergyOracle(), pair = await guidePairInputs(page);
      type Kind = 'turning' | 'crossing';
      function roots(inputs: GuideInputs) {
        const response = oracle.bridgeSeismicResponse(inputs), result: Record<Kind, number[]> = { turning: [], crossing: [] };
        for (const [kind, field] of [['turning', 'velocityMps'], ['crossing', 'relativeM']] as const) {
          for (let i = 1; i < response.samples.length; i++) {
            const a = response.samples[i - 1], b = response.samples[i];
            if (a.timeS < 16 - 1e-9 || a[field] === 0 && b[field] === 0 || Math.sign(a[field]) === Math.sign(b[field])) continue;
            const time = a[field] === 0 ? a.timeS : b[field] === 0 ? b.timeS
              : a.timeS + (b.timeS - a.timeS) * Math.abs(a[field]) / (Math.abs(a[field]) + Math.abs(b[field]));
            if (!result[kind].some(previous => Math.abs(previous - time) < 1e-7)) result[kind].push(time);
          }
        }
        return result;
      }
      const aRoots = roots(pair[0]), bRoots = roots(pair[1]);
      const scene = page.locator('[data-bridge-energy-orbit="scene"]');
      const bucket = () => page.evaluate(() => (window as any).__bucket());
      const nearest = (times: number[], time: number) => times.reduce((best, next) => Math.abs(next - time) < Math.abs(best - time) ? next : best);
      async function point(orbit: import('@playwright/test').Locator, x: number, y: number) {
        const svg = orbit.locator('[data-orbit-cycle-timeline]');
        await svg.evaluate(node => node.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }));
        return svg.evaluate((node, p) => {
          const svg = node as SVGSVGElement, local = svg.createSVGPoint(); local.x = p.x; local.y = p.y;
          const screen = local.matrixTransform(svg.getScreenCTM()!); return { x: screen.x, y: screen.y };
        }, { x, y });
      }
      async function tap(orbit: import('@playwright/test').Locator, kind: Kind, time: number, expected: number) {
        const before = await bucket(), lane = orbit.locator('[data-orbit-cycle-tap="' + kind + '"]');
        await lane.scrollIntoViewIfNeeded();
        const box = await lane.boundingBox(), position = { x: (time - 16) / 8 * box!.width, y: box!.height / 2 };
        if (width === 320) await lane.tap({ position }); else await lane.click({ position });
        await expect.poll(bucket).toEqual({ ...before, seismicTime: expected, seismicPlaying: false, autoDriving: false });
        await expect(orbit.locator('[data-orbit-cycle-current]')).toHaveAttribute('data-orbit-cycle-current', kind);
        await expect(orbit.locator('[data-orbit-cycle-selected="true"]')).toHaveAttribute('data-orbit-cycle-time', String(expected));
        await expect(orbit.locator('[data-orbit-frame]')).toHaveAttribute('data-orbit-frame', String(expected));
      }
      async function capture(orbit: import('@playwright/test').Locator, selector: string, name: string) {
        const node = orbit.locator(selector), before = await bucket();
        await expect.poll(() => node.evaluate(async el => {
          const settle = () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
          await settle(); el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }); await settle();
          const box = el.getBoundingClientRect();
          for (let p = el.parentElement; p; p = p.parentElement) {
            if (!/auto|scroll|hidden|clip/.test(getComputedStyle(p).overflowY)) continue;
            const b = p.getBoundingClientRect(); if (box.top < b.top || box.bottom > b.bottom) return false;
          }
          return box.top >= 0 && box.bottom <= innerHeight;
        })).toBe(true);
        await node.screenshot({ path: join(report, 'cycle-tap-' + width + '-' + name + '.png') });
        expect(await bucket()).toEqual(before);
      }
      const aTime = aRoots.turning.at(-2)!;
      await tap(scene, 'turning', aTime + 0.01, aTime);
      await capture(scene, '[data-orbit-cycle-map-status]', 'turning-status');
      await capture(scene, '[data-orbit-cycle-timeline]', 'turning');
      await tap(scene, 'crossing', aTime, nearest(aRoots.crossing, aTime));
      await capture(scene, '[data-orbit-cycle-timeline]', 'crossing');
      for (const kind of ['turning', 'crossing'] as Kind[]) {
        const band = scene.locator('[data-orbit-cycle-tap="' + kind + '"]');
        const box = await band.boundingBox(); expect(box!.height).toBeGreaterThanOrEqual(44);
        expect(await band.evaluate(el => getComputedStyle(el).cursor)).toBe('pointer');
        expect(await band.evaluate(el => !el.hasAttribute('tabindex') && !!el.closest('[aria-hidden="true"]'))).toBe(true);
      }
      for (const x of [5, 255]) {
        const before = await bucket(), p = await point(scene, x, 42);
        await page.mouse.click(p.x, p.y); expect(await bucket()).toEqual(before);
      }
      const beforeAxis = await bucket(), axis = await point(scene, 130, 168);
      await page.mouse.click(axis.x, axis.y); expect(await bucket()).toEqual(beforeAxis);
      if (width === 320) {
        const p = await point(scene, 150, 110), before = await bucket();
        const session = await page.context().newCDPSession(page);
        await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: p.x, y: p.y }] });
        for (const dy of [15, 30, 50, 75]) await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: p.x, y: p.y - dy }] });
        await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await session.detach(); expect(await bucket()).toEqual(before);
      }
      await page.getByRole('button', { name: 'B · current', exact: true }).click();
      const bTime = nearest(bRoots.turning, aTime); expect(bTime).not.toBe(aTime);
      await tap(scene, 'turning', aTime, bTime);
      const next = scene.getByRole('button', { name: 'Next center crossing', exact: true });
      const target = Number(await next.getAttribute('data-orbit-next-time')), beforeKey = await bucket();
      await next.focus(); await next.press('Enter');
      expect(await bucket()).toEqual({ ...beforeKey, seismicTime: target, seismicPlaying: false, autoDriving: false });
      await page.evaluate(() => (window as any).__set({ seismicSceneCompare: false, seismicSceneTrial: 'current', seismicIntensityG: 1e-9, seismicTime: 19.417 }));
      const tinyRoots = roots(await flowCurrentInputs(page));
      await tap(scene, 'crossing', 21, nearest(tinyRoots.crossing, 21));
      expect(Number(await scene.locator('[data-orbit-energy="stored"]').getAttribute('data-orbit-value'))).toBeGreaterThan(0);
      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 0, seismicTime: 24 }));
      const zero = await bucket(), zeroPoint = await point(scene, 130, 42);
      await page.mouse.click(zeroPoint.x, zeroPoint.y); expect(await bucket()).toEqual(zero);
      await expect(scene.locator('[data-orbit-cycle-current]')).toHaveCount(0);
      expect(await scene.locator('[data-orbit-cycle-tap="turning"]').evaluate(el => getComputedStyle(el).cursor)).toBe('default');
      await capture(scene, '[data-orbit-cycle-timeline]', 'zero');
      await page.evaluate(() => (window as any).__set({ bridgeView: '2d', seismicIntensityG: 0.12, seismicTime: 19.417 }));
      const fallback = page.locator('[data-bridge-energy-orbit="fallback"]'), fallbackRoots = roots(await flowCurrentInputs(page));
      await tap(fallback, 'turning', 21, nearest(fallbackRoots.turning, 21));
      expect((await bucket()).seismicSceneNote).toBe('Keep my direct inspection.');
      expect((await bucket()).seismicIntervalPinS).toBe(19.117);
      await checkWorkflowHealth(page);
      await writeFile(join(report, 'cycle-tap-' + width + '-evidence.json'), JSON.stringify({ aTime, bTime, tinyRoots, fallbackRoots }, null, 2));
    });
  }
  });

  for (const width of [1280, 320]) {
    test('cycle readout: precise event identity follows the selected timeline at ' + width + 'px', async ({ page }) => {
      test.setTimeout(180_000);
      const report = process.env.BRIDGE_CAPTURE_REPORT || ENHANCEMENT_REPORT;
      await mkdir(report, { recursive: true });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await mountWorkflow(page, width, { bridgeView: 'immersive', bridgeObserver: 'bank', seismicEnabled: true,
        seismicGuideOpen: true, seismicEnergyOrbit: true, seismicEnergyInterval: true,
        seismicIntervalPinS: 19.117, seismicTime: 19.417, seismicPlaying: false, autoDriving: false,
        bridgeBankYaw: 18, seismicSceneNote: 'Keep my cycle explanation.' });
      await page.getByRole('button', { name: 'From the riverbank', exact: true }).click();
      await page.getByRole('button', { name: 'Prepare 5% / 20% comparison', exact: true }).click();
      await page.getByRole('button', { name: 'A · reference', exact: true }).click();
      await page.evaluate(() => (window as any).__set({ seismicTime: 19.417 }));
      const scene = page.locator('[data-bridge-energy-orbit="scene"]');
      const core = scene.locator('[data-orbit-cycle-timeline]');
      const bucket = () => page.evaluate(() => (window as any).__bucket());
      async function check(orbit: import('@playwright/test').Locator, trial: string, time: number, kind?: string) {
        const map = orbit.locator('[data-orbit-cycle-map]'), status = map.locator('[data-orbit-cycle-map-status]');
        await expect(map).toHaveAttribute('data-orbit-cycle-map', trial);
        await expect(status.locator('[data-orbit-cycle-time-label]')).toHaveText(time.toFixed(3) + ' s');
        await expect(status).toContainText(time < 16 ? 'Before free vibration' : 'Free vibration');
        await expect(status.locator('[data-orbit-cycle-scope]')).toHaveText(trial === 'reference' ? 'A · reference'
          : (await bucket()).seismicSceneCompare && (await bucket()).bridgeView === 'immersive' ? 'B · current' : 'Current experiment');
        expect(await status.locator('[data-orbit-cycle-time-label]').evaluate(node => ({
          font: getComputedStyle(node).fontSize, nowrap: getComputedStyle(node).whiteSpace,
          native: !node.closest('svg,[aria-hidden="true"]'), live: node.closest('[aria-live]')?.getAttribute('aria-live')
        }))).toEqual({ font: '14px', nowrap: 'nowrap', native: true, live: 'off' });
        const badge = status.locator('[data-orbit-cycle-current]');
        if (kind) {
          await expect(badge).toHaveAttribute('data-orbit-cycle-current', kind);
          await expect(badge).toContainText(kind === 'turning' ? 'Turning point' : 'Center crossing');
          await expect(badge.locator('[aria-hidden="true"]')).toHaveText(kind === 'turning' ? '○' : '◇');
          await expect(map.locator('[data-orbit-cycle-selected="true"]')).toHaveCount(1);
          await expect(map.locator('[data-orbit-cycle-selected="true"]')).toHaveAttribute('data-orbit-cycle-marker', kind);
        } else {
          await expect(badge).toHaveCount(0);
          await expect(map.locator('[data-orbit-cycle-selected="true"]')).toHaveCount(0);
        }
        expect(await map.locator('[data-orbit-cycle-timeline]').evaluate(node => [...node.querySelectorAll('text')]
          .every(text => Number(text.getAttribute('font-size')) === 16 && 16 * (text.getScreenCTM()?.a || 0) >= 10))).toBe(true);
        expect(await map.evaluate(node => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1);
      }
      async function capture(name: string) {
        const before = await bucket();
        await expect.poll(() => core.evaluate(async node => {
          const settle = () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
          await settle(); node.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }); await settle();
          const b = node.getBoundingClientRect();
          for (let p = node.parentElement; p; p = p.parentElement) {
            if (!/auto|scroll|hidden|clip/.test(getComputedStyle(p).overflowY)) continue;
            const r = p.getBoundingClientRect(); if (b.top < r.top || b.bottom > r.bottom) return false;
          }
          return b.top >= 0 && b.bottom <= innerHeight;
        })).toBe(true);
        await core.screenshot({ path: join(report, 'cycle-readout-' + width + '-' + name + '.png') });
        expect(await bucket()).toEqual(before);
      }
      const beforeJump = await bucket();
      const turningTime = Number(await scene.locator('[data-orbit-next="turning"]').getAttribute('data-orbit-next-time'));
      await scene.getByRole('button', { name: 'Next turning point', exact: true }).click();
      expect(await bucket()).toEqual({ ...beforeJump, seismicTime: turningTime, seismicPlaying: false, autoDriving: false });
      await check(scene, 'reference', turningTime, 'turning'); await capture('turning');
      const nearTime = turningTime + (Number(turningTime.toFixed(3)) >= turningTime ? 1e-5 : -1e-5);
      expect(nearTime.toFixed(3)).toBe(turningTime.toFixed(3));
      await page.evaluate(time => (window as any).__set({ seismicTime: time }), nearTime);
      await check(scene, 'reference', nearTime);
      await page.evaluate(time => (window as any).__set({ seismicTime: time }), turningTime);
      await page.getByRole('button', { name: 'B · current', exact: true }).click();
      await check(scene, 'current', turningTime);
      await page.evaluate(() => (window as any).__set({ seismicSceneCompare: false, seismicIntensityG: 1e-9, seismicDampingRatio: 0.05, seismicTime: 19.417 }));
      await page.getByRole('button', { name: 'Save earthquake trial', exact: true }).click();
      const saved = (await bucket()).seismicTrials;
      await page.evaluate(() => (window as any).__set({ seismicSceneCompare: true, seismicSceneSource: 'saved', seismicSceneTrial: 'reference',
        seismicReferenceIndex: 0, seismicIntensityG: 2e-9, seismicDampingRatio: 0.25 }));
      const crossingTime = Number(await scene.locator('[data-orbit-next="crossing"]').getAttribute('data-orbit-next-time'));
      await scene.getByRole('button', { name: 'Next center crossing', exact: true }).click();
      await check(scene, 'reference', crossingTime, 'crossing'); await capture('crossing');
      await page.evaluate(() => (window as any).__set({ seismicTime: 10.123 }));
      await check(scene, 'reference', 10.123);
      await page.evaluate(() => (window as any).__set({ seismicSceneCompare: false, seismicSceneTrial: 'current', seismicIntensityG: 0, seismicTime: 24 }));
      await check(scene, 'current', 24); await capture('zero');
      await page.evaluate(() => (window as any).__set({ bridgeView: '2d', seismicIntensityG: 0.12, seismicTime: 19.417 }));
      const fallback = page.locator('[data-bridge-energy-orbit="fallback"]');
      const fallbackTime = Number(await fallback.locator('[data-orbit-next="turning"]').getAttribute('data-orbit-next-time'));
      await fallback.getByRole('button', { name: 'Next turning point', exact: true }).click();
      await check(fallback, 'current', fallbackTime, 'turning');
      expect((await bucket()).seismicTrials).toEqual(saved);
      expect((await bucket()).seismicIntervalPinS).toBe(beforeJump.seismicIntervalPinS);
      expect((await bucket()).seismicSceneNote).toBe('Keep my cycle explanation.');
      await checkWorkflowHealth(page);
      await writeFile(join(report, 'cycle-readout-' + width + '-evidence.json'), JSON.stringify({ turningTime, nearTime, crossingTime, fallbackTime }, null, 2));
    });
  }

  for (const width of [1280, 320]) {
    test('cycle preview: selected-trial destinations explain energy before inspection at ' + width + 'px', async ({ page }) => {
      test.setTimeout(180_000);
      const report = process.env.BRIDGE_CAPTURE_REPORT || ENHANCEMENT_REPORT;
      await mkdir(report, { recursive: true });
      const oracle = await loadFrameEnergyOracle();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await mountWorkflow(page, width, { bridgeView: 'immersive', bridgeObserver: 'bank', seismicEnabled: true,
        seismicGuideOpen: true, seismicEnergyOrbit: true, seismicTime: 19.417, seismicIntervalPinS: 12.319,
        seismicPlaying: false, autoDriving: false, bridgeBankYaw: 18, bridgeBankPitch: -8,
        seismicPrediction: 'Compare cycle moments.', seismicSceneNote: 'Keep my energy explanation.' });
      await page.getByRole('button', { name: 'From the riverbank', exact: true }).click();
      await page.getByRole('button', { name: 'Prepare 5% / 20% comparison', exact: true }).click();
      await page.getByRole('button', { name: 'A · reference', exact: true }).click();
      await page.evaluate(() => (window as any).__set({ seismicTime: 19.417 }));
      const scene = page.locator('[data-bridge-energy-orbit="scene"]');
      const controls = scene.locator('[data-orbit-cycle-controls]');
      const bucket = () => page.evaluate(() => (window as any).__bucket());
      function close(actual: number, expected: number) {
        if (expected === 0) expect(actual).toBe(0);
        else expect(Math.abs(actual - expected)).toBeLessThanOrEqual(Math.abs(expected) * 2e-9);
      }
      function share(value: number, other: number) {
        if (value === 0) return '0%';
        if (other === 0) return '100%';
        const percent = value / (value + other) * 100;
        return percent < 0.1 ? '<0.1%' : percent > 99.9 ? '>99.9%' : percent.toFixed(1) + '%';
      }
      async function check(orbit: import('@playwright/test').Locator, inputs: GuideInputs, trial: string) {
        const response = oracle.bridgeSeismicResponse(inputs), result: any[] = [];
        for (const kind of ['turning', 'crossing']) for (const step of ['previous', 'next']) {
          const button = orbit.locator('[data-orbit-step="' + step + '"][data-orbit-kind="' + kind + '"]');
          const preview = button.locator('[data-orbit-target-preview]');
          await expect(button.locator('[data-orbit-cycle-symbol]')).toHaveAttribute('aria-hidden', 'true');
          await expect(button.locator('[data-orbit-cycle-symbol]')).toHaveText(kind === 'turning' ? '○' : '◇');
          if (await button.isDisabled()) { await expect(preview).toHaveCount(0); continue; }
          const time = Number(await button.getAttribute('data-orbit-' + step + '-time'));
          const point = oracle.bridgeSeismicSample(response, time), coordinate = 2 * Math.PI * response.naturalFrequencyHz * point.relativeM;
          const kinetic = point.velocityMps * point.velocityMps / 2, elastic = coordinate * coordinate / 2, stored = kinetic + elastic;
          const primary = kind === 'turning' ? elastic : kinetic, other = kind === 'turning' ? kinetic : elastic;
          await expect(preview).toHaveAttribute('data-orbit-target-preview', kind);
          await expect(preview).toHaveAttribute('data-orbit-target-time', String(time));
          await expect(preview).toHaveAttribute('data-orbit-target-trial', trial);
          close(Number(await preview.getAttribute('data-orbit-target-stored')), stored);
          close(Number(await preview.getAttribute('data-orbit-target-share')), primary / stored);
          await expect(preview.locator('[data-orbit-target-percent]')).toHaveText(share(primary, other));
          await expect(button.locator('[data-orbit-destination]')).toHaveText(time.toFixed(3) + ' s');
          await expect(button).toHaveAccessibleDescription(new RegExp(time.toFixed(3) + ' s.*' + (kind === 'turning' ? 'Elastic' : 'Kinetic')));
          for (const [id, amount] of [['kinetic', kinetic], ['elastic', elastic]] as const) {
            const part = preview.locator('[data-orbit-target-part="' + id + '"]');
            close(Number(await part.getAttribute('data-orbit-target-fraction')), amount / stored);
            expect(await part.evaluate(node => !!node.closest('[aria-hidden="true"]'))).toBe(true);
          }
          expect(await button.evaluate(node => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1);
          result.push({ kind, step, time, kinetic, elastic, stored });
        }
        return result;
      }
      async function capture(name: string) {
        const before = await bucket();
        await expect.poll(() => controls.evaluate(async node => {
          const settle = () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
          await settle(); node.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }); await settle();
          const b = node.getBoundingClientRect();
          for (let p = node.parentElement; p; p = p.parentElement) {
            if (!/auto|scroll|hidden|clip/.test(getComputedStyle(p).overflowY)) continue;
            const r = p.getBoundingClientRect(); if (b.top < r.top || b.bottom > r.bottom) return false;
          }
          return b.top >= 0 && b.bottom <= innerHeight;
        })).toBe(true);
        await controls.screenshot({ path: join(report, 'cycle-preview-' + width + '-' + name + '.png') });
        expect(await bucket()).toEqual(before);
      }
      const guideA = (await bucket()).seismicGuideBaseline.inputs;
      const initial = await check(scene, guideA, 'reference'); expect(initial).toHaveLength(4);
      await capture('reference');
      for (const [index, target] of initial.entries()) {
        await page.evaluate(() => (window as any).__set({ seismicTime: 19.417 }));
        const before = await bucket(), button = scene.locator('[data-orbit-step="' + target.step + '"][data-orbit-kind="' + target.kind + '"]');
        await button.focus(); await button.press(index % 2 ? 'Enter' : 'Space');
        expect(await bucket()).toEqual({ ...before, seismicTime: target.time, seismicPlaying: false, autoDriving: false });
        await expect(scene.locator('[data-orbit-frame]')).toHaveAttribute('data-orbit-frame', String(target.time));
        close(Number(await scene.locator('[data-orbit-energy="stored"]').getAttribute('data-orbit-value')), target.stored);
      }
      await page.getByRole('button', { name: 'B · current', exact: true }).click();
      const current = await check(scene, await flowCurrentInputs(page), 'current'); expect(current).toHaveLength(4);
      await page.evaluate(() => (window as any).__set({ seismicSceneCompare: false, seismicIntensityG: 1e-9, seismicDampingRatio: 0.05 }));
      await page.getByRole('button', { name: 'Save earthquake trial', exact: true }).click();
      const saved = (await bucket()).seismicTrials;
      await page.evaluate(() => (window as any).__set({ seismicSceneCompare: true, seismicSceneSource: 'saved', seismicSceneTrial: 'reference',
        seismicReferenceIndex: 0, seismicIntensityG: 2e-9, seismicDampingRatio: 0.25, seismicTime: 19.417 }));
      const tiny = await check(scene, saved[0].inputs, 'reference'); expect(tiny).toHaveLength(4);
      expect(tiny.every(point => point.stored > 0 && point.stored < 0.001)).toBe(true);
      await capture('tiny');
      for (const time of [0, 24]) {
        await page.evaluate(time => (window as any).__set({ seismicTime: time }), time);
        await check(scene, saved[0].inputs, 'reference');
        const boundary = time === 0 ? 'previous' : 'next';
        for (const kind of ['turning', 'crossing']) await expect(scene.locator('[data-orbit-step="' + boundary + '"][data-orbit-kind="' + kind + '"]')).toBeDisabled();
      }
      await page.evaluate(() => (window as any).__set({ seismicSceneCompare: false, seismicSceneTrial: 'current', seismicIntensityG: 0 }));
      await expect(controls.locator('[data-orbit-target-preview]')).toHaveCount(0);
      for (const button of await controls.locator('button').all()) await expect(button).toBeDisabled();
      await capture('zero');
      await page.evaluate(() => (window as any).__set({ bridgeView: '2d', seismicIntensityG: 0.12, seismicTime: 19.417 }));
      await check(page.locator('[data-bridge-energy-orbit="fallback"]'), await flowCurrentInputs(page), 'current');
      expect((await bucket()).seismicTrials).toEqual(saved);
      expect((await bucket()).seismicSceneNote).toBe('Keep my energy explanation.');
      await checkWorkflowHealth(page);
      await writeFile(join(report, 'cycle-preview-' + width + '-evidence.json'), JSON.stringify({ initial, current, tiny }, null, 2));
    });
  }

  for (const width of [1280, 320]) {
    test('orbit composition: precise shares stay readable through trial and cycle changes at ' + width + 'px', async ({ page }) => {
      test.setTimeout(180_000);
      const report = process.env.BRIDGE_CAPTURE_REPORT || ENHANCEMENT_REPORT;
      await mkdir(report, { recursive: true });
      const oracle = await loadFrameEnergyOracle();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await mountWorkflow(page, width, { bridgeView: 'immersive', bridgeObserver: 'bank', seismicEnabled: true,
        seismicGuideOpen: true, seismicEnergyOrbit: true, seismicIntervalPinS: 12.319, seismicTime: 7.217,
        seismicPlaying: false, autoDriving: false, seismicSceneNote: 'Keep the energy explanation.',
        seismicPrediction: 'Compare energy at a turning point.', bridgeBankYaw: 18, bridgeBankPitch: -8 });
      await page.getByRole('button', { name: 'From the riverbank', exact: true }).click();
      await page.getByRole('button', { name: 'Prepare 5% / 20% comparison', exact: true }).click();
      await page.getByRole('button', { name: 'A · reference', exact: true }).click();
      const scene = page.locator('[data-bridge-energy-orbit="scene"]');
      const split = scene.locator('[data-orbit-split]');
      const selector = page.getByRole('combobox', { name: 'Scene key moments', exact: true });
      const bucket = () => page.evaluate(() => (window as any).__bucket());
      function close(actual: number, expected: number) {
        if (expected === 0) expect(actual).toBe(0);
        else expect(Math.abs(actual - expected)).toBeLessThanOrEqual(Math.abs(expected) * 2e-9);
      }
      function share(value: number, other: number) {
        if (value + other === 0) return '—';
        if (value === 0) return '0%';
        if (other === 0) return '100%';
        const percent = value / (value + other) * 100;
        return percent < 0.1 ? '<0.1%' : percent > 99.9 ? '>99.9%' : percent.toFixed(1) + '%';
      }
      async function check(orbit: import('@playwright/test').Locator, inputs: GuideInputs, trial: string) {
        const time = (await bucket()).seismicTime;
        const response = oracle.bridgeSeismicResponse(inputs), point = oracle.bridgeSeismicSample(response, time);
        const kinetic = point.velocityMps * point.velocityMps / 2, coordinate = 2 * Math.PI * response.naturalFrequencyHz * point.relativeM;
        const expected = { kinetic, elastic: coordinate * coordinate / 2, stored: kinetic + coordinate * coordinate / 2 };
        const card = orbit.locator('[data-orbit-split]');
        await expect(card).toHaveAttribute('data-orbit-split', trial);
        await expect(orbit.locator('[data-orbit-frame]')).toHaveAttribute('data-orbit-frame', String(time));
        await expect(card.locator('[data-orbit-energy-total]')).toHaveText(frameEnergyNumber(expected.stored));
        for (const id of ['kinetic', 'elastic', 'stored'] as const) {
          const row = card.locator('[data-orbit-energy="' + id + '"]');
          close(Number(await row.getAttribute('data-orbit-value')), expected[id]);
          await expect(row.locator('strong')).toHaveText(frameEnergyNumber(expected[id]));
          await expect(row).toContainText('J/kg');
          if (id === 'stored') continue;
          expect(await row.evaluate(node => node.parentElement?.tagName === 'DL' && !node.closest('[aria-hidden="true"]'))).toBe(true);
          await expect(row.locator('dt')).toHaveText(id === 'kinetic' ? 'Kinetic' : 'Elastic');
          await expect(row.locator('[data-orbit-energy-share]')).toHaveText(share(expected[id], expected[id === 'kinetic' ? 'elastic' : 'kinetic']));
          const fraction = expected.stored > 0 ? expected[id] / expected.stored : 0;
          close(Number(await card.locator('[data-orbit-part="' + id + '"]').getAttribute('data-orbit-fraction')), fraction);
        }
        if (expected.stored > 0) await expect(card.locator('[data-orbit-energy-scale-help]')).toHaveText('Bar = 100% of the stored total now.');
        else await expect(card.locator('[data-orbit-energy-scale-help]')).toHaveCount(0);
        await expect(card.locator('[data-orbit-energy-bar]')).toHaveAccessibleName(expected.stored > 0
          ? 'Stored energy split: Kinetic ' + share(expected.kinetic, expected.elastic) + ', Elastic ' + share(expected.elastic, expected.kinetic)
          : 'No stored energy');
        expect(await card.evaluate(node => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1);
        return expected;
      }
      async function capture(name: string) {
        const before = await bucket();
        await expect.poll(() => split.evaluate(async node => {
          const settle = () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
          await settle(); node.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }); await settle();
          const b = node.getBoundingClientRect();
          for (let p = node.parentElement; p; p = p.parentElement) {
            if (!/auto|scroll|hidden|clip/.test(getComputedStyle(p).overflowY)) continue;
            const r = p.getBoundingClientRect(); if (b.top < r.top || b.bottom > r.bottom) return false;
          }
          return b.top >= 0 && b.bottom <= innerHeight;
        })).toBe(true);
        await split.screenshot({ path: join(report, 'orbit-composition-' + width + '-' + name + '.png') });
        expect(await bucket()).toEqual(before);
      }
      const guideA = (await bucket()).seismicGuideBaseline.inputs;
      await selector.selectOption('motion');
      const peak = await check(scene, guideA, 'reference');
      for (const id of ['kinetic', 'elastic']) await expect(split.locator('[data-orbit-energy-share="' + id + '"]')).toHaveText(
        (await page.locator('[data-moment-energy-component="' + id + '"] dd').first().textContent())!);
      await capture('peak');
      const beforeCycle = await bucket();
      const destination = Number(await scene.locator('[data-orbit-next="crossing"]').getAttribute('data-orbit-next-time'));
      await scene.getByRole('button', { name: 'Next center crossing', exact: true }).click();
      expect(await bucket()).toEqual({ ...beforeCycle, seismicTime: destination, seismicPlaying: false, autoDriving: false });
      const crossing = await check(scene, guideA, 'reference');
      expect(crossing.kinetic).toBeGreaterThan(crossing.elastic);
      await page.getByRole('button', { name: 'B · current', exact: true }).click();
      const current = await check(scene, await flowCurrentInputs(page), 'current');
      expect(current.stored).not.toBe(crossing.stored);
      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 1e-9, seismicDampingRatio: 0.05, seismicSceneCompare: false }));
      await page.getByRole('button', { name: 'Save earthquake trial', exact: true }).click();
      const saved = (await bucket()).seismicTrials;
      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 2e-9, seismicDampingRatio: 0.25,
        seismicSceneCompare: true, seismicSceneSource: 'saved', seismicReferenceIndex: 0, seismicSceneTrial: 'reference' }));
      await selector.selectOption('acceleration');
      const tiny = await check(scene, saved[0].inputs, 'reference');
      expect(tiny.stored).toBeGreaterThan(0); expect(tiny.stored).toBeLessThan(0.001);
      await expect(split.locator('[data-orbit-energy-total]')).toContainText('e-');
      await capture('tiny');
      await page.evaluate(() => (window as any).__set({ seismicSceneCompare: false, seismicSceneTrial: 'current', seismicIntensityG: 0 }));
      await check(scene, await flowCurrentInputs(page), 'current');
      await expect(split.locator('[data-orbit-energy-empty]')).toHaveText('No stored energy');
      await expect(split.locator('[data-orbit-energy-share]')).toHaveText(['—', '—']);
      await capture('zero');
      await page.evaluate(() => (window as any).__set({ bridgeView: '2d', seismicIntensityG: 0.12, seismicTime: 17.123 }));
      await check(page.locator('[data-bridge-energy-orbit="fallback"]'), await flowCurrentInputs(page), 'current');
      expect((await bucket()).seismicTrials).toEqual(saved);
      expect((await bucket()).seismicSceneNote).toBe('Keep the energy explanation.');
      await checkWorkflowHealth(page);
      await writeFile(join(report, 'orbit-composition-' + width + '-evidence.json'), JSON.stringify({ peak, crossing, current, tiny }, null, 2));
    });
  }

  for (const width of [1280, 320]) {
    test('moment energy: preview and orbit retain selected evidence at ' + width + 'px', async ({ page }) => {
      test.setTimeout(240_000);
      const report = process.env.BRIDGE_CAPTURE_REPORT || ENHANCEMENT_REPORT;
      await mkdir(report, { recursive: true });
      const oracle = await loadFrameEnergyOracle();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await mountWorkflow(page, width, { bridgeView: 'immersive', bridgeObserver: 'bank', seismicEnabled: true,
        seismicGuideOpen: true, seismicArchetype: 'balanced', seismicFrequencyHz: 1.1, seismicIntensityG: 0.12,
        seismicDampingRatio: 0.05, seismicTime: 7.217, seismicIntervalPinS: 12.319, seismicEnergyOrbit: false,
        seismicPlaying: false, autoDriving: false, bridgeBankYaw: 18, bridgeBankPitch: -8,
        bridgeWalkPos: 0.63, bridgeLookYaw: 27, bridgeLookPitch: -12, seismicTrialName: 'Keep peak trial',
        seismicPrediction: 'Keep prediction.', seismicObservation: 'Keep explanation.',
        seismicScenePrediction: 'Keep scene prediction.', seismicSceneNote: 'Keep scene note.', seismicGuidePrediction: 'Keep guide prediction.' });
      await page.getByRole('button', { name: 'From the riverbank', exact: true }).click();
      await page.getByRole('button', { name: 'Prepare 5% / 20% comparison', exact: true }).click();
      await page.getByRole('button', { name: 'Record paired evidence', exact: true }).click();
      await page.getByRole('button', { name: 'A · reference', exact: true }).click();
      const preview = page.locator('[data-moment-energy-preview]'), action = page.locator('[data-moment-energy-route="orbit"]');
      const orbit = page.locator('[data-bridge-energy-orbit="scene"]');
      const selector = page.getByRole('combobox', { name: 'Scene key moments', exact: true });
      async function bucket() { return page.evaluate(() => (window as any).__bucket()); }
      function close(actual: number, expected: number) {
        if (expected === 0) expect(actual).toBe(0);
        else expect(Math.abs(actual - expected)).toBeLessThanOrEqual(Math.abs(expected) * 2e-9);
      }
      function sample(inputs: GuideInputs, id: 'motion' | 'acceleration') {
        const response = oracle.bridgeSeismicResponse(inputs);
        const field = id === 'motion' ? 'relativeM' : 'absoluteAccelerationMps2';
        const point = response.samples.reduce((best: any, next: any) => Math.abs(next[field]) > Math.abs(best[field]) ? next : best, response.samples[0]);
        const kinetic = point.velocityMps * point.velocityMps / 2;
        const elasticCoordinate = 2 * Math.PI * response.naturalFrequencyHz * point.relativeM;
        const elastic = elasticCoordinate * elasticCoordinate / 2;
        return { time: point.timeS, kinetic, elastic, stored: kinetic + elastic };
      }
      async function check(inputs: GuideInputs, id: 'motion' | 'acceleration', trial: 'reference' | 'current') {
        const expected = sample(inputs, id);
        await selector.selectOption(id);
        await expect(preview).toHaveAttribute('data-moment-energy-trial', trial);
        await expect(preview).toHaveAttribute('data-moment-energy-time', String(expected.time));
        await expect(page.locator('[data-moment-time-label]')).toHaveText(expected.time.toFixed(3) + ' s');
        close(Number(await preview.locator('[data-moment-energy-total]').getAttribute('data-moment-energy-total')), expected.stored);
        await expect(preview.locator('[data-moment-energy-total]')).toHaveText(frameEnergyNumber(expected.stored) + ' J/kg');
        for (const id of ['kinetic', 'elastic'] as const) {
          const row = preview.locator('[data-moment-energy-component="' + id + '"]');
          close(Number(await row.getAttribute('data-moment-energy-value')), expected[id]);
          close(Number(await row.getAttribute('data-moment-energy-fraction')), expected[id] / expected.stored);
          await expect(row.locator('dd').last()).toHaveText(frameEnergyNumber(expected[id]) + ' J/kg');
          const widthPercent = await preview.locator('[data-moment-energy-part="' + id + '"]').evaluate(node => parseFloat((node as HTMLElement).style.width));
          // CSS serializes percentage widths with fewer digits than numeric data attributes.
          expect(Math.abs(widthPercent - expected[id] / expected.stored * 100)).toBeLessThanOrEqual(expected[id] / expected.stored * 100 * 5e-6);
          expect(await row.evaluate(node => !node.closest('svg,[aria-hidden="true"]') && node.parentElement?.tagName === 'DL')).toBe(true);
        }
        await expect(preview.locator('[data-moment-energy-bar]')).toHaveAttribute('aria-hidden', 'true');
        await expect(preview.locator('[data-moment-energy-scale-help]')).toHaveText('Bar = 100% of the stored total now.');
        await expect(action).toHaveAttribute('aria-controls', 'bridge-energy-orbit-scene');
        await expect(action).toBeEnabled();
        expect(await preview.evaluate(node => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1);
        expect((await bucket()).seismicTime).toBe(expected.time);
        return expected;
      }
      async function open(expected: ReturnType<typeof sample>, trial: 'reference' | 'current', key: 'Enter' | 'Space') {
        const before = await bucket();
        await action.focus(); await action.press(key);
        expect(await bucket()).toEqual({ ...before, seismicEnergyOrbit: true, seismicPlaying: false, autoDriving: false });
        await expect(orbit).toHaveAttribute('open', '');
        await expect(orbit.locator('summary').first()).toBeFocused();
        await expect(orbit.locator('[data-orbit-frame]')).toHaveAttribute('data-orbit-frame', String(expected.time));
        await expect(orbit.locator('[data-orbit-frame]')).toHaveAttribute('data-orbit-trial', trial);
        for (const id of ['kinetic', 'elastic', 'stored'] as const) {
          close(Number(await orbit.locator('[data-orbit-energy="' + id + '"]').getAttribute('data-orbit-value')), expected[id]);
        }
      }
      async function capture(locator: import('@playwright/test').Locator, name: string) {
        const before = await bucket();
        await expect.poll(() => locator.evaluate(async node => {
          const settle = () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
          await settle(); node.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }); await settle();
          const b = node.getBoundingClientRect();
          for (let p = node.parentElement; p; p = p.parentElement) {
            if (!/auto|scroll|hidden|clip/.test(getComputedStyle(p).overflowY)) continue;
            const r = p.getBoundingClientRect(); if (b.top < r.top || b.bottom > r.bottom) return false;
          }
          return b.top >= 0 && b.bottom <= innerHeight && node.scrollWidth - node.clientWidth <= 1;
        })).toBe(true);
        await locator.screenshot({ path: join(report, 'moment-energy-' + width + '-' + name + '.png') });
        expect(await bucket()).toEqual(before);
      }
      const guideA = (await bucket()).seismicGuideBaseline.inputs;
      const reference = await check(guideA, 'motion', 'reference');
      await capture(preview, 'preview'); await capture(action, 'action');
      await open(reference, 'reference', 'Enter');
      await page.getByRole('button', { name: 'B · current', exact: true }).click();
      expect((await bucket()).seismicTime).toBe(reference.time);
      await expect(preview).toHaveCount(0);
      const current = await flowCurrentInputs(page);
      const currentPeak = await check(current, 'acceleration', 'current');
      await open(currentPeak, 'current', 'Space');
      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 1e-9, seismicDampingRatio: 0.05,
        seismicSceneCompare: false, seismicEnergyOrbit: false }));
      await page.getByRole('button', { name: 'Save earthquake trial', exact: true }).click();
      const saved = (await bucket()).seismicTrials;
      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 2e-9, seismicDampingRatio: 0.25,
        seismicSceneCompare: true, seismicSceneSource: 'saved', seismicReferenceIndex: 0, seismicSceneTrial: 'reference' }));
      const tiny = await check(saved[0].inputs, 'acceleration', 'reference');
      expect(tiny.stored).toBeGreaterThan(0); expect(tiny.stored).toBeLessThan(0.001);
      await expect(preview.locator('[data-moment-energy-total]')).toContainText('e-');
      await expect(page.locator('[data-moment-scientific-help]')).toContainText('2.5e-6 means 0.0000025');
      await capture(preview, 'tiny-preview'); await open(tiny, 'reference', 'Space');
      expect((await bucket()).seismicTrials).toEqual(saved);
      await page.evaluate(() => (window as any).__set({ seismicSceneCompare: false, seismicSceneTrial: 'current', seismicIntensityG: 0 }));
      for (const id of ['motion', 'acceleration']) await expect(selector.locator('option[value="' + id + '"]')).toBeDisabled();
      await expect(preview).toHaveCount(0); await expect(action).toHaveCount(0);
      await checkWorkflowHealth(page);
      await writeFile(join(report, 'moment-energy-' + width + '-evidence.json'), JSON.stringify({ width, guideA, reference, current, currentPeak, tinyInputs: saved[0].inputs, tiny }, null, 2));
    });
  }

  for (const width of [1000, 320]) {
    test('force addition: signed vectors, shared scales and selected trial evidence at ' + width + 'px', async ({ page }) => {
      test.setTimeout(360_000);
      const report = process.env.BRIDGE_CAPTURE_REPORT || ENHANCEMENT_REPORT;
      await mkdir(report, { recursive: true });
      const oracle = await loadFrameEnergyOracle(), checks: any[] = [], responses = new Map<string, any>();
      function responseFor(inputs: GuideInputs) {
        const key = JSON.stringify(inputs);
        if (!responses.has(key)) responses.set(key, oracle.bridgeSeismicResponse(inputs));
        return responses.get(key);
      }
      const normal = { archetype: 'balanced', groundFrequencyHz: 1.1, intensityG: 0.12, dampingRatio: 0.05 };
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await mountWorkflow(page, width, { bridgeView: '3d', seismicEnabled: true, seismicForceLens: true,
        seismicArchetype: normal.archetype, seismicFrequencyHz: normal.groundFrequencyHz, seismicIntensityG: normal.intensityG,
        seismicDampingRatio: normal.dampingRatio, seismicTime: 7.217, seismicIntervalPinS: 12.319,
        seismicPlaying: false, autoDriving: false, seismicTrialName: 'Force reference', seismicSceneNote: 'Keep my force evidence.' });
      await page.getByRole('button', { name: 'Labelled 2D view', exact: true }).click();
      await page.getByRole('button', { name: 'Save earthquake trial', exact: true }).click();
      async function bucket() { return page.evaluate(() => (window as any).__bucket()); }
      const saved = (await bucket()).seismicTrials;
      let frame = page.locator('[data-force-addition="mechanism"]');
      function forces(response: any, point: any) {
        const omega = 2 * Math.PI * response.naturalFrequencyHz;
        const spring = -omega * omega * point.relativeM, damping = -2 * response.settings.dampingRatio * omega * point.velocityMps;
        return { spring, damping, net: spring + damping };
      }
      function maximum(response: any) {
        const omega = 2 * Math.PI * response.naturalFrequencyHz;
        return Math.max(omega * omega * response.peaks.relativeM,
          2 * response.settings.dampingRatio * omega * response.peaks.velocityMps, response.peaks.absoluteAccelerationMps2);
      }
      async function check(inputs: GuideInputs, time: number, name: string, origin = 'mechanism', trial = 'current', other?: GuideInputs) {
        const panel = page.locator('[data-force-addition="' + origin + '"]');
        const response = responseFor(inputs), point = oracle.bridgeSeismicSample(response, time), values = forces(response, point);
        const bound = Math.max(maximum(response), other ? maximum(responseFor(other)) : 0), limit = (bound > 0 ? bound : 0.001) * 1.04;
        const kind = values.spring === 0 && values.damping === 0 ? 'zero' : values.net === 0 ? 'balanced'
          : values.spring === 0 || values.damping === 0 ? 'single' : (values.spring > 0) === (values.damping > 0) ? 'reinforce' : 'oppose';
        const close = (actual: number, expected: number) => expect(Math.abs(actual - expected)).toBeLessThanOrEqual(Math.abs(expected) * 2e-9 + 1e-20);
        await expect(panel).toHaveAttribute('data-force-addition-time', String(time));
        await expect(panel).toHaveAttribute('data-force-addition-trial', trial);
        await expect(panel).toHaveAttribute('data-force-addition-kind', kind);
        await expect(panel).toHaveAttribute('aria-live', 'off');
        close(Number(await panel.getAttribute('data-force-addition-limit')), limit);
        const caption = other ? trial === 'reference' ? 'A · reference' : 'B · current' : 'Current experiment';
        await expect(panel.locator('[data-force-addition-caption]')).toHaveText(caption + ' · ' + time.toFixed(3) + ' s');
        await expect(panel.locator('dl > div')).toHaveCount(3);
        const signed = (value: number) => (value > 0 ? '+' : '') + frameEnergyNumber(value);
        for (const id of ['spring', 'damping', 'net'] as const) {
          const value = values[id], reading = panel.locator('dd[data-force-addition-reading="' + id + '"]');
          close(Number(await reading.getAttribute('data-force-addition-value')), value);
          await expect(reading).toHaveText(signed(value) + ' N/kg');
          await expect(reading.locator('..').locator('dt')).toContainText(id === 'net' ? 'Net force' : id === 'spring' ? 'Spring' : 'Damping');
          const geom = await reading.evaluate(node => {
            const box = node.getBoundingClientRect(), parent = node.parentElement!.getBoundingClientRect();
            return { font: parseFloat(getComputedStyle(node).fontSize), nowrap: getComputedStyle(node).whiteSpace,
              inside: box.left >= parent.left && box.right <= parent.right + 1, overflow: node.parentElement!.scrollWidth - node.parentElement!.clientWidth };
          });
          expect(geom).toMatchObject({ font: 14, nowrap: 'nowrap', inside: true }); expect(geom.overflow).toBeLessThanOrEqual(1);
          const arrow = panel.locator('[data-force-addition-arrow="' + id + '"]');
          const start = id === 'damping' ? 120 + values.spring / limit * 100 : 120;
          const end = 120 + (id === 'spring' ? values.spring : values.net) / limit * 100;
          close(Number(await arrow.getAttribute('data-force-start')), start); close(Number(await arrow.getAttribute('data-force-end')), end);
          close(Number(await arrow.getAttribute('data-force-addition-value')), value);
          const circle = arrow.locator(':scope > circle'); close(Number(await circle.getAttribute('cx')), start);
          await expect(arrow.locator('path')).toHaveCount(Math.abs(end - start) > 0.5 ? 1 : 0);
        }
        close(Number(await panel.locator('[data-force-addition-acceleration]').getAttribute('data-force-addition-acceleration')), values.net);
        await expect(panel.locator('[data-force-addition-acceleration]')).toHaveText(signed(values.net) + ' m/s²');
        expect(Math.abs(values.net - point.absoluteAccelerationMps2)).toBeLessThanOrEqual(Math.max(Math.abs(values.spring), Math.abs(values.damping)) * 2e-9 + 1e-20);
        await expect(panel.locator('[data-force-addition-direction]')).toHaveAttribute('data-force-addition-direction', values.net > 0 ? 'positive' : values.net < 0 ? 'negative' : 'zero');
        const scientific = Object.values(values).some(value => value !== 0 && Math.abs(value) < 0.001);
        await expect(panel.locator('[data-force-addition-scientific]')).toHaveCount(scientific ? 1 : 0);
        expect(await panel.evaluate(node => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1);
        checks.push({ name, origin, trial, time, kind, values, limit, scientific }); return values;
      }
      async function capture(name: string) {
        const viewport = page.viewportSize()!, before = await bucket();
        const initial = await frame.evaluate(node => ({ width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height }));
        try {
          await page.setViewportSize({ width: viewport.width, height: Math.max(viewport.height, Math.ceil(initial.height) + 1500) });
          let bounds: any, previous = '', stable = 0;
          try { await expect.poll(async () => {
            bounds = await frame.evaluate(async node => {
              const settle = () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
              await settle(); node.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }); await settle();
              const box = node.getBoundingClientRect(), clips = [];
              for (let parent = node.parentElement; parent; parent = parent.parentElement) {
                if (!/auto|scroll|hidden|clip/.test(getComputedStyle(parent).overflowY)) continue;
                const clip = parent.getBoundingClientRect();
                clips.push({ tag: parent.tagName, id: parent.id, top: clip.top, bottom: clip.bottom,
                  clientHeight: parent.clientHeight, scrollHeight: parent.scrollHeight, scrollTop: parent.scrollTop,
                  overflow: getComputedStyle(parent).overflowY });
              }
              return { width: box.width, top: box.top, bottom: box.bottom, viewport: innerHeight, clips };
            });
            const current = JSON.stringify(bounds); stable = current === previous ? stable + 1 : 1; previous = current;
            return stable >= 2 && Math.abs(bounds.width - initial.width) <= 1 && bounds.top >= 0 && bounds.bottom <= bounds.viewport
              && bounds.clips.every((clip: { top: number; bottom: number }) => bounds.top >= clip.top && bounds.bottom <= clip.bottom);
          }, { timeout: 15000, intervals: [100, 250, 500], message: 'Force addition diagram is stable and completely visible at its original width' }).toBe(true);
          } finally { await writeFile(join(report, 'force-addition-' + width + '-' + name + '-layout.json'), JSON.stringify({ initial, bounds, stable }, null, 2)); }
          expect(Math.abs(bounds.width - initial.width)).toBeLessThanOrEqual(1);
          expect(bounds.top).toBeGreaterThanOrEqual(0); expect(bounds.bottom).toBeLessThanOrEqual(bounds.viewport);
          for (const clip of bounds.clips) { expect(bounds.top).toBeGreaterThanOrEqual(clip.top); expect(bounds.bottom).toBeLessThanOrEqual(clip.bottom); }
          await frame.screenshot({ path: join(report, 'force-addition-' + width + '-' + name + '.png') });
        } finally {
          await page.setViewportSize(viewport);
          await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
        }
        expect(await bucket(), 'native capture preserves notes, pin and saved evidence').toEqual(before);
      }
      await check(normal, 7.217, 'initial'); await check(normal, 7.217, 'initial-fallback', 'fallback');
      const response = responseFor(normal);
      for (const kind of ['reinforce', 'oppose']) {
        const point = response.samples.filter((p: any) => {
          const f = forces(response, p);
          return p.timeS > 2 && p.timeS < 16 && Math.min(Math.abs(f.spring), Math.abs(f.damping)) > 0.005
            && ((f.spring > 0) === (f.damping > 0)) === (kind === 'reinforce');
        }).sort((a: any, b: any) => {
          const first = forces(response, a), second = forces(response, b);
          return Math.min(Math.abs(second.spring), Math.abs(second.damping)) - Math.min(Math.abs(first.spring), Math.abs(first.damping));
        })[0];
        expect(point).toBeTruthy(); await page.evaluate(time => (window as any).__set({ seismicTime: time }), point.timeS);
        await check(normal, point.timeS, kind); await capture(kind);
      }
      for (const time of [0, 16, 24]) {
        await page.evaluate(time => (window as any).__set({ seismicTime: time }), time); await check(normal, time, 'time-' + time);
      }
      const undamped = { ...normal, dampingRatio: 0 };
      await page.evaluate(() => (window as any).__set({ seismicTime: 7.217, seismicDampingRatio: 0 }));
      expect((await check(undamped, 7.217, 'undamped')).damping).toBe(0);
      await page.evaluate(() => (window as any).__set({ seismicDampingRatio: 0.05, seismicIntensityG: 0 }));
      expect(await check({ ...normal, intensityG: 0 }, 7.217, 'zero')).toEqual({ spring: -0, damping: -0, net: -0 });
      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 1e-9 }));
      await check({ ...normal, intensityG: 1e-9 }, 7.217, 'tiny'); await capture('tiny');
      const details = frame.locator('[data-force-addition-details]'), summary = details.locator('summary');
      await summary.focus(); await summary.press('Enter'); await expect(details).toHaveAttribute('open', '');
      await expect(details).toContainText('1 N/kg = 1 m/s²'); await summary.press('Enter'); await expect(details).not.toHaveAttribute('open');
      const current = { ...normal, archetype: 'stiff', intensityG: 0.24, dampingRatio: 0.2 };
      await page.evaluate(() => (window as any).__set({ seismicArchetype: 'stiff', seismicIntensityG: 0.24, seismicDampingRatio: 0.2,
        seismicSceneCompare: true, seismicSceneSource: 'saved', seismicReferenceIndex: 0, seismicSceneTrial: 'reference' }));
      await page.getByRole('button', { name: 'From the riverbank', exact: true }).click();
      await page.getByRole('button', { name: 'A · reference', exact: true }).click();
      const mechanism = await check(current, 7.217, 'current-during-a');
      const a = await check(normal, 7.217, 'selected-a', 'scene', 'reference', current); expect(a).not.toEqual(mechanism);
      const sceneAddition = page.locator('[data-force-addition="scene"]');
      frame = sceneAddition.locator('[data-force-addition-diagram]'); await capture('scene-a-diagram');
      frame = sceneAddition.locator('[data-force-addition-equation]'); await capture('scene-a-readings');
      const sceneDetails = sceneAddition.locator('[data-force-addition-details]');
      await sceneDetails.locator('summary').focus(); await sceneDetails.locator('summary').press('Enter');
      await expect(sceneDetails).toHaveAttribute('open', ''); await expect(sceneDetails).toContainText('1 N/kg = 1 m/s²');
      await sceneDetails.locator('summary').press('Enter'); await expect(sceneDetails).not.toHaveAttribute('open');
      frame = sceneAddition;
      const sharedLimit = await frame.getAttribute('data-force-addition-limit');
      await page.getByRole('button', { name: 'B · current', exact: true }).click();
      expect(await check(current, 7.217, 'selected-b', 'scene', 'current', normal)).toEqual(mechanism);
      await expect(frame).toHaveAttribute('data-force-addition-limit', sharedLimit!);
      await page.getByRole('button', { name: 'Labelled 2D view', exact: true }).click();
      expect(await check(current, 7.217, 'current-fallback', 'fallback')).toEqual(mechanism);
      expect(await bucket()).toMatchObject({ seismicIntervalPinS: 12.319, seismicPlaying: false, autoDriving: false,
        seismicSceneNote: 'Keep my force evidence.', seismicTrials: saved });
      await checkWorkflowHealth(page);
      await writeFile(join(report, 'force-addition-' + width + '-checks.json'), JSON.stringify({ width, checks }, null, 2));
    });
  }

  for (const width of [1000, 320]) {
    test('energy composition: shares stay distinct from amounts at ' + width + 'px', async ({ page }) => {
      test.setTimeout(300_000);
      const report = process.env.BRIDGE_CAPTURE_REPORT || ENHANCEMENT_REPORT;
      await mkdir(report, { recursive: true });
      const oracle = await loadFrameEnergyOracle(), cache = new Map<string, any>(), checks: any[] = [];
      const normal = { archetype: 'balanced', groundFrequencyHz: 1.1, intensityG: 0.12, dampingRatio: 0.05 };
      function response(inputs: GuideInputs) {
        const key = JSON.stringify(inputs);
        if (!cache.has(key)) cache.set(key, oracle.bridgeSeismicResponse(inputs));
        return cache.get(key);
      }
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await mountWorkflow(page, width, { bridgeView: '3d', seismicEnabled: true, seismicTime: 7.217,
        seismicArchetype: 'balanced', seismicFrequencyHz: 1.1, seismicIntensityG: 0.12, seismicDampingRatio: 0.05,
        seismicIntervalPinS: 12.319, seismicTrialName: 'Energy reference', seismicObservation: 'Compare shares and amounts.' });
      await page.getByRole('button', { name: 'Labelled 2D view', exact: true }).click();
      await page.getByRole('button', { name: 'Save earthquake trial', exact: true }).click();
      const saved = await page.evaluate(() => (window as any).__bucket().seismicTrials);
      const map = page.locator('[data-seismic-energy-map="current"]');
      const panel = map.locator('[data-energy-composition]');
      const frame = map.locator('[data-energy-map-node="stored"]');
      async function check(inputs: GuideInputs, time: number, name: string) {
        const point = oracle.bridgeSeismicSample(response(inputs), time);
        const amounts = [point.kineticJPerKg, point.strainJPerKg], total = amounts[0] + amounts[1];
        const close = (actual: number, expected: number) => expect(Math.abs(actual - expected)).toBeLessThanOrEqual(Math.abs(expected) * 2e-9 + 1e-30);
        await expect(map).toHaveAttribute('data-energy-map-time', String(time));
        await expect(map.locator('[data-energy-map-caption]')).toContainText('Current experiment · ' + time.toFixed(3) + ' s');
        await expect(panel).toHaveAttribute('data-energy-composition', total > 0 ? 'stored' : 'empty');
        close(Number(await panel.getAttribute('data-energy-composition-total')), total);
        close(Number(await map.locator('[data-energy-map-amount="stored"]').getAttribute('data-energy-value')), total);
        await expect(panel.getByRole('heading', { name: 'Share of stored energy now', exact: true })).toBeVisible();
        await expect(panel.locator('[data-energy-composition-bar]')).toHaveAttribute('aria-hidden', 'true');
        await expect(panel.locator('dl > div')).toHaveCount(2);
        const shares: string[] = [];
        for (const [i, id] of ['kinetic', 'elastic'].entries()) {
          const value = amounts[i], other = amounts[1 - i], fraction = total > 0 ? value / total : 0;
          const reading = panel.locator('dd[data-energy-composition-share="' + id + '"]');
          const text = (await reading.innerText()).trim(); shares.push(text);
          close(Number(await reading.getAttribute('data-energy-fraction-share')), fraction);
          if (total === 0) expect(text).toBe('—');
          else if (value === 0) expect(text).toBe('0%');
          else if (other === 0) expect(text).toBe('100%');
          else if (fraction < 0.001) expect(text).toBe('<0.1%');
          else if (fraction > 0.999) expect(text).toBe('>99.9%');
          else expect(Math.abs(parseFloat(text) / 100 - fraction)).toBeLessThanOrEqual(0.0005 + 1e-15);
          await expect(reading.locator('..').locator('dt')).toHaveText(i === 0 ? 'Kinetic' : 'Elastic');
          const detail = panel.locator('dd[data-energy-map-detail="' + id + '"]');
          close(Number(await detail.getAttribute('data-energy-value')), value);
          await expect(detail).toHaveText(frameEnergyNumber(value) + ' J/kg');
          const part = panel.locator('[data-energy-map-part="' + id + '"]');
          close(Number(await part.getAttribute('data-energy-fraction')), fraction);
          const css = await part.evaluate(node => (node as HTMLElement).style.width);
          expect(Math.abs(parseFloat(css) / 100 - fraction)).toBeLessThanOrEqual(5e-7);
          const geometry = await reading.evaluate(node => {
            const box = node.getBoundingClientRect(), parent = node.parentElement!.getBoundingClientRect();
            return { inside: box.left >= parent.left && box.right <= parent.right + 1,
              font: parseFloat(getComputedStyle(node).fontSize), nowrap: getComputedStyle(node).whiteSpace };
          });
          expect(geometry).toEqual({ inside: true, font: 14, nowrap: 'nowrap' });
        }
        await expect(panel.locator('[data-energy-composition-empty]')).toHaveCount(total === 0 ? 1 : 0);
        await expect(panel.locator('[data-energy-composition-help]')).toContainText('Compare the J/kg total above');
        expect(await panel.evaluate(node => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1);
        expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
        checks.push({ name, time, inputs, total, amounts, shares }); return { total, amounts, shares };
      }
      async function capture(name: string) {
        const viewport = page.viewportSize()!, before = await page.evaluate(() => (window as any).__bucket());
        const initial = await frame.boundingBox(); expect(initial).toBeTruthy();
        try {
          await page.setViewportSize({ width, height: Math.max(viewport.height, Math.ceil(initial!.height) + 1000) });
          await expect.poll(async () => frame.evaluate(async node => {
            await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
            node.scrollIntoView({ block: 'center', behavior: 'instant' });
            const box = node.getBoundingClientRect();
            if (box.top < 0 || box.bottom > innerHeight) return false;
            for (let parent = node.parentElement; parent; parent = parent.parentElement) {
              if (!/auto|scroll|hidden|clip/.test(getComputedStyle(parent).overflowY)) continue;
              const clip = parent.getBoundingClientRect(); if (box.top < clip.top || box.bottom > clip.bottom) return false;
            }
            return true;
          }), { timeout: 15000 }).toBe(true);
          expect(Math.abs((await frame.boundingBox())!.width - initial!.width)).toBeLessThanOrEqual(1);
          await frame.screenshot({ path: join(report, 'energy-composition-' + width + '-' + name + '.png') });
        } finally { await page.setViewportSize(viewport); }
        expect(await page.evaluate(() => (window as any).__bucket())).toEqual(before);
      }
      const ordinary = await check(normal, 7.217, 'ordinary'); await capture('ordinary');
      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 1e-9 }));
      const tiny = await check({ ...normal, intensityG: 1e-9 }, 7.217, 'tiny');
      expect(tiny.shares).toEqual(ordinary.shares); expect(tiny.total).toBeLessThan(ordinary.total * 1e-15);
      await capture('tiny');
      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 0 }));
      expect((await check({ ...normal, intensityG: 0 }, 7.217, 'zero')).shares).toEqual(['—', '—']);
      await capture('zero');
      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 0.12, seismicTime: 0 }));
      await check(normal, 0, 'initial-rest');
      let storedAtEnd = 0;
      for (const time of [16, 24]) {
        await page.evaluate(time => (window as any).__set({ seismicTime: time }), time);
        const reading = await check(normal, time, 'decay-' + time);
        if (time === 16) storedAtEnd = reading.total;
        else { expect(reading.total).toBeGreaterThan(0); expect(reading.total).toBeLessThan(storedAtEnd); }
      }
      const imbalanced = response(normal).samples.find((p: any) => p.timeS > 2 && p.kineticJPerKg > 0 && p.strainJPerKg > 0
        && Math.min(p.kineticJPerKg, p.strainJPerKg) / (p.kineticJPerKg + p.strainJPerKg) < 0.001);
      expect(imbalanced).toBeTruthy();
      await page.evaluate(time => (window as any).__set({ seismicTime: time }), imbalanced.timeS);
      expect((await check(normal, imbalanced.timeS, 'tiny-share')).shares.sort()).toEqual(['<0.1%', '>99.9%']);
      const current = { ...normal, dampingRatio: 0.2 };
      await page.evaluate(() => (window as any).__set({ seismicTime: 7.217, seismicDampingRatio: 0.2,
        seismicSceneCompare: true, seismicSceneSource: 'saved', seismicReferenceIndex: 0, seismicSceneTrial: 'reference' }));
      await page.getByRole('button', { name: 'From the riverbank', exact: true }).click();
      await page.getByRole('button', { name: 'A · reference', exact: true }).click();
      const duringA = await check(current, 7.217, 'current-while-scene-a'); expect(duringA.amounts).not.toEqual(ordinary.amounts);
      await page.getByRole('button', { name: 'Labelled 2D view', exact: true }).click();
      expect(await check(current, 7.217, '2d-return')).toEqual(duringA);
      expect(await page.evaluate(() => (window as any).__bucket())).toMatchObject({ seismicTrials: saved,
        seismicIntervalPinS: 12.319, seismicObservation: 'Compare shares and amounts.' });
      await checkWorkflowHealth(page);
      await writeFile(join(report, 'energy-composition-' + width + '-checks.json'), JSON.stringify(checks, null, 2));
    });
  }

  for (const width of [1000, 320]) {
    test('motion gap: signed relative displacement connects timeline curves at ' + width + 'px', async ({ page }) => {
      test.setTimeout(300_000);
      const report = process.env.BRIDGE_CAPTURE_REPORT || ENHANCEMENT_REPORT;
      await mkdir(report, { recursive: true });
      const oracle = await loadFrameEnergyOracle(), cache = new Map<string, any>(), checks: any[] = [];
      const normal = { archetype: 'balanced', groundFrequencyHz: 1.1, intensityG: 0.12, dampingRatio: 0.05 };
      function response(inputs: GuideInputs) {
        const key = JSON.stringify(inputs);
        if (!cache.has(key)) cache.set(key, oracle.bridgeSeismicResponse(inputs));
        return cache.get(key);
      }
      const close = (actual: number, expected: number) => expect(Math.abs(actual - expected))
        .toBeLessThanOrEqual(Math.abs(expected) * 2e-9 + 1e-30);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await mountWorkflow(page, width, { bridgeView: '3d', seismicEnabled: true, seismicTime: 7.217,
        seismicArchetype: 'balanced', seismicFrequencyHz: 1.1, seismicIntensityG: 0.12, seismicDampingRatio: 0.05,
        seismicIntervalPinS: 12.319, seismicTrialName: 'Motion gap reference', seismicPrediction: 'Predict the signed gap.',
        seismicObservation: 'Keep the ground and deck evidence.', seismicSceneNote: 'Keep my scene note.' });
      await page.getByRole('button', { name: 'Labelled 2D view', exact: true }).click();
      await page.getByRole('button', { name: 'Save earthquake trial', exact: true }).click();
      const saved = await page.evaluate(() => (window as any).__bucket().seismicTrials);
      const timeline = page.locator('[data-bridge-seismic-timeline]');
      const slider = timeline.locator('[data-seismic-chart-slider]');
      const overlay = slider.locator('[data-timeline-motion-overlay]');
      const panel = timeline.locator('[data-timeline-motion-gap]');
      await timeline.getByRole('button', { name: 'Motion over time', exact: true }).click();
      async function curves() {
        return slider.locator(':scope > svg polyline').evaluateAll(nodes => nodes.map(node => node.getAttribute('points')));
      }
      async function check(inputs: GuideInputs, time: number, name: string) {
        const record = response(inputs), point = oracle.bridgeSeismicSample(record, time);
        const limit = Math.max(0.001, record.peaks.groundM, record.peaks.absoluteM) * 100 * 1.04;
        const y = (meters: number) => 90 - meters * 100 / limit * 82;
        const groundY = y(point.groundM), deckY = y(point.absoluteM), percent = time / record.durationS * 100;
        const cm = point.relativeM * 100, direction = cm > 0 ? 'positive' : cm < 0 ? 'negative' : 'zero';
        await expect(timeline).toHaveAttribute('data-bridge-seismic-timeline', 'motion');
        await expect(slider).toHaveAttribute('aria-valuenow', String(time));
        await expect(overlay).toHaveAttribute('data-timeline-motion-overlay', String(time));
        await expect(overlay).toHaveAttribute('aria-hidden', 'true');
        await expect(panel).toHaveAttribute('data-timeline-motion-gap', String(time));
        await expect(panel).toHaveAttribute('aria-live', 'off');
        await expect(panel.locator('[data-timeline-motion-caption]')).toHaveText('Current experiment · ' + time.toFixed(3) + ' s');
        const reading = panel.locator('dd[data-timeline-motion-relative]');
        close(Number(await reading.getAttribute('data-timeline-motion-relative')), cm);
        await expect(reading).toHaveText((cm > 0 ? '+' : '') + frameEnergyNumber(cm) + ' cm');
        await expect(panel.locator('[data-timeline-motion-direction]')).toHaveAttribute('data-timeline-motion-direction', direction);
        await expect(panel.locator('[data-timeline-motion-scientific]')).toHaveCount(cm !== 0 && Math.abs(cm) < 0.001 ? 1 : 0);
        const help = timeline.locator('#bridge-seismic-motion-gap-help');
        await expect(help).toBeVisible();
        const describedBy = (await slider.getAttribute('aria-describedby'))!.split(/\s+/);
        expect(describedBy).toContain('bridge-seismic-timeline-help');
        expect(describedBy).toContain('bridge-seismic-motion-gap-help');
        for (const id of describedBy) await expect(page.locator('[id="' + id + '"]')).toHaveCount(1);
        const segment = overlay.locator('[data-timeline-motion-segment]');
        await expect(segment).toHaveCount(1);
        close(Number(await segment.getAttribute('data-relative-m')), point.relativeM);
        const actual = await overlay.evaluate(node => {
          const box = node.getBoundingClientRect(), slider = node.parentElement!.getBoundingClientRect();
          const line = node.querySelector('[data-timeline-motion-segment]') as HTMLElement;
          const css = line.style;
          return { height: box.height, width: box.width, sliderWidth: slider.width,
            pointerEvents: getComputedStyle(node).pointerEvents,
            segment: { left: parseFloat(css.left), top: parseFloat(css.top), height: parseFloat(css.height), width: parseFloat(css.width) },
            markers: [...node.querySelectorAll('[data-timeline-motion-marker]')].map(marker => {
              const svg = marker as SVGSVGElement, markerBox = svg.getBoundingClientRect();
              return { id: svg.getAttribute('data-timeline-motion-marker'), value: Number(svg.getAttribute('data-motion-value')),
                y: Number(svg.getAttribute('data-motion-y')), left: parseFloat(svg.style.left), top: parseFloat(svg.style.top),
                width: markerBox.width, height: markerBox.height,
                actualX: markerBox.left + markerBox.width / 2 - box.left,
                actualY: markerBox.top + markerBox.height / 2 - box.top,
                viewBox: svg.getAttribute('viewBox'), focusable: svg.getAttribute('focusable'),
                circleR: svg.querySelector('circle')?.getAttribute('r') ?? null,
                path: svg.querySelector('path')?.getAttribute('d') ?? null };
            }) };
        });
        expect(actual.height).toBe(180); expect(actual.width).toBe(actual.sliderWidth);
        expect(actual.pointerEvents).toBe('none');
        expect(actual.segment.left).toBeCloseTo(percent, 4);
        expect(actual.segment.top).toBeCloseTo(Math.min(groundY, deckY), 3);
        expect(actual.segment.height).toBeCloseTo(Math.abs(deckY - groundY), 3);
        expect(actual.segment.width).toBe(3);
        expect(actual.markers.map(marker => marker.id).sort()).toEqual(['deck', 'ground']);
        for (const marker of actual.markers) {
          const expectedValue = marker.id === 'ground' ? point.groundM : point.absoluteM, expectedY = y(expectedValue);
          close(marker.value, expectedValue); close(marker.y, expectedY);
          expect(marker.left).toBeCloseTo(percent, 4); expect(marker.top).toBeCloseTo(expectedY, 3);
          expect(marker.actualX).toBeCloseTo(actual.width * percent / 100, 0);
          expect(marker.actualY).toBeCloseTo(expectedY, 0);
          expect(marker.width).toBe(14); expect(marker.height).toBe(14);
          expect(marker.viewBox).toBe('0 0 14 14'); expect(marker.focusable).toBe('false');
          if (marker.id === 'ground') { expect(marker.circleR).toBe('6'); expect(marker.path).toBeNull(); }
          else { expect(marker.circleR).toBeNull(); expect(marker.path!.replace(/\s+/g, '')).toBe('M73L117L711L37Z'); }
        }
        const markerDifference = actual.markers.find(marker => marker.id === 'deck')!.y
          - actual.markers.find(marker => marker.id === 'ground')!.y;
        expect(markerDifference).toBeCloseTo(-cm / limit * 82, 9);
        const cursor = slider.locator('[data-seismic-time-cursor]');
        await expect(cursor).toHaveAttribute('data-seismic-time-cursor', String(time));
        expect(await cursor.getAttribute('stroke-dasharray')).toBeTruthy();
        expect(await cursor.getAttribute('stroke')).not.toBe('#f8fafc');
        const textGeometry = await reading.evaluate(node => {
          const box = node.getBoundingClientRect(), parent = node.closest('[data-timeline-motion-gap]')!.getBoundingClientRect();
          return { inside: box.left >= parent.left && box.right <= parent.right + 1,
            font: parseFloat(getComputedStyle(node).fontSize), nowrap: getComputedStyle(node).whiteSpace };
        });
        expect(textGeometry.inside).toBe(true); expect(textGeometry.font).toBeGreaterThanOrEqual(14);
        expect(textGeometry.nowrap).toBe('nowrap');
        expect(await panel.evaluate(node => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1);
        expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
        checks.push({ name, time, inputs, limit, relativeM: point.relativeM, direction, actual });
        return { point, limit, actual };
      }
      async function capture(name: string) {
        const viewport = page.viewportSize()!, before = await page.evaluate(() => (window as any).__bucket());
        const initial = await timeline.boundingBox(); expect(initial).toBeTruthy();
        try {
          await page.setViewportSize({ width, height: Math.max(viewport.height, Math.ceil(initial!.height) + 1000) });
          await expect.poll(async () => timeline.evaluate(async node => {
            await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
            node.scrollIntoView({ block: 'center', behavior: 'instant' });
            const box = node.getBoundingClientRect();
            if (box.top < 0 || box.bottom > innerHeight) return false;
            for (let parent = node.parentElement; parent; parent = parent.parentElement) {
              if (!/auto|scroll|hidden|clip/.test(getComputedStyle(parent).overflowY)) continue;
              const clip = parent.getBoundingClientRect(); if (box.top < clip.top || box.bottom > clip.bottom) return false;
            }
            return true;
          }), { timeout: 15000 }).toBe(true);
          expect(Math.abs((await timeline.boundingBox())!.width - initial!.width)).toBeLessThanOrEqual(1);
          await timeline.screenshot({ path: join(report, 'motion-gap-' + width + '-' + name + '.png') });
        } finally { await page.setViewportSize(viewport); }
        expect(await page.evaluate(() => (window as any).__bucket())).toEqual(before);
      }
      const fixedCurves = await curves();
      const clear = (sign: number) => response(normal).samples.filter((point: any) => point.timeS > 2 && point.timeS < 14 && point.relativeM * sign > 0)
        .sort((a: any, b: any) => Math.abs(b.relativeM) - Math.abs(a.relativeM))[0];
      for (const [sign, name] of [[1, 'positive'], [-1, 'negative']] as const) {
        const point = clear(sign); expect(point).toBeTruthy();
        await page.evaluate(time => (window as any).__set({ seismicTime: time }), point.timeS);
        const result = await check(normal, point.timeS, name);
        expect(Math.abs(result.point.relativeM)).toBeGreaterThan(0.001);
        expect(await curves(), 'scrubbing leaves full-event curves and their scale unchanged').toEqual(fixedCurves);
        await capture(name);
      }
      await slider.focus(); await slider.press('Home');
      await check(normal, 0, 'keyboard-home');
      await slider.press('ArrowRight'); await check(normal, 0.05, 'keyboard-step');
      await slider.press('ArrowLeft'); await check(normal, 0, 'keyboard-return');
      await slider.press('End'); await check(normal, 24, 'keyboard-end');
      await expect(slider).toHaveAttribute('aria-valuetext', '24.000 s · Observation ends');
      expect(await curves()).toEqual(fixedCurves);
      await page.evaluate(() => (window as any).__set({ seismicTime: 16 }));
      await check(normal, 16, 'ground-shaking-ends');
      await page.evaluate(() => (window as any).__set({ seismicTime: 7.217, seismicIntensityG: 1e-9 }));
      const tiny = await check({ ...normal, intensityG: 1e-9 }, 7.217, 'tiny');
      expect(tiny.point.relativeM).not.toBe(0);
      expect(tiny.actual.segment.height).toBeLessThan(0.001);
      await expect(panel.locator('[data-timeline-motion-relative]')).toContainText(/e-\d+ cm$/);
      await capture('tiny');
      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 0 }));
      const zero = await check({ ...normal, intensityG: 0 }, 7.217, 'zero-input');
      expect(zero.actual.segment.height).toBe(0);
      expect(zero.actual.markers.map(marker => marker.y)).toEqual([90, 90]);
      await capture('zero');
      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 0.12,
        seismicEnergyInterval: true, seismicIntervalPinS: 7.217 }));
      await check(normal, 7.217, 'coincident-pin');
      await expect(slider.locator('[data-seismic-interval-pin]')).toHaveAttribute('data-seismic-interval-pin', '7.217');
      await expect(slider.locator('[data-seismic-pin-marker]')).toHaveCount(1);
      await expect(slider.locator('[data-seismic-interval-band]')).toHaveCount(0);
      expect((await slider.getAttribute('aria-describedby'))!.split(/\s+/)).toContain('bridge-seismic-interval-help');
      for (const [label, kind] of [['Energy over time', 'energy'], ['Compare trials', 'comparison']]) {
        await timeline.getByRole('button', { name: label, exact: true }).click();
        await expect(timeline).toHaveAttribute('data-bridge-seismic-timeline', kind);
        await expect(overlay).toHaveCount(0); await expect(panel).toHaveCount(0);
        await expect(timeline.locator('#bridge-seismic-motion-gap-help')).toHaveCount(0);
        expect((await slider.getAttribute('aria-describedby'))!.split(/\s+/)).not.toContain('bridge-seismic-motion-gap-help');
        await expect(slider).toHaveAttribute('aria-valuenow', '7.217');
        expect(await slider.locator('[data-seismic-time-cursor]').getAttribute('stroke-dasharray')).toBeFalsy();
      }
      await timeline.getByRole('button', { name: 'Motion over time', exact: true }).click();
      await page.evaluate(() => (window as any).__set({ seismicDampingRatio: 0.2, seismicIntervalPinS: 12.319,
        seismicSceneCompare: true, seismicSceneSource: 'saved', seismicReferenceIndex: 0, seismicSceneTrial: 'reference' }));
      await page.getByRole('button', { name: 'From the riverbank', exact: true }).click();
      await page.getByRole('button', { name: 'A · reference', exact: true }).click();
      const current = { ...normal, dampingRatio: 0.2 }, duringA = await check(current, 7.217, 'current-while-scene-a');
      expect(duringA.point.relativeM).not.toBe(oracle.bridgeSeismicSample(response(normal), 7.217).relativeM);
      const currentMarkup = await panel.innerHTML(), currentOverlay = await overlay.innerHTML();
      await page.getByRole('button', { name: 'B · current', exact: true }).click();
      await check(current, 7.217, 'current-while-scene-b');
      expect(await panel.innerHTML()).toBe(currentMarkup); expect(await overlay.innerHTML()).toBe(currentOverlay);
      await page.getByRole('button', { name: 'A · reference', exact: true }).click();
      await page.getByRole('button', { name: 'Labelled 2D view', exact: true }).click();
      await check(current, 7.217, '2d-return');
      expect(await page.evaluate(() => (window as any).__bucket())).toMatchObject({ seismicTrials: saved,
        seismicIntervalPinS: 12.319, seismicEnergyInterval: true, seismicPlaying: false, autoDriving: false,
        seismicPrediction: 'Predict the signed gap.', seismicObservation: 'Keep the ground and deck evidence.',
        seismicSceneNote: 'Keep my scene note.' });
      await checkWorkflowHealth(page);
      await writeFile(join(report, 'motion-gap-' + width + '-checks.json'), JSON.stringify(checks, null, 2));
    });
  }

  for (const width of [1000, 320]) {
    test('scene readout: precise time and signed motion at ' + width + 'px', async ({ page }) => {
      test.setTimeout(180_000);
      const report = process.env.BRIDGE_CAPTURE_REPORT || ENHANCEMENT_REPORT;
      await mkdir(report, { recursive: true });
      const oracle = await loadFrameEnergyOracle();
      const normal = { archetype: 'balanced', groundFrequencyHz: 1.1, intensityG: 0.12, dampingRatio: 0.05 };
      const cache = new Map<string, any>(), checks: any[] = [];
      function response(inputs: GuideInputs) { const key = JSON.stringify(inputs); if (!cache.has(key)) cache.set(key, oracle.bridgeSeismicResponse(inputs)); return cache.get(key); }
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await mountWorkflow(page, width, { bridgeView: 'immersive', bridgeObserver: 'bank', seismicEnabled: true,
        seismicTime: 7.217, seismicMotionGuide: false, seismicArchetype: 'balanced', seismicFrequencyHz: 1.1,
        seismicIntensityG: 0.12, seismicDampingRatio: 0.05, seismicObservation: 'Keep my observation.', seismicIntervalPinS: 12.319 });
      await page.getByRole('button', { name: 'From the riverbank', exact: true }).click();
      await page.getByRole('button', { name: 'Save earthquake trial', exact: true }).click();
      const saved = await page.evaluate(() => (window as any).__bucket().seismicTrials);
      const hud = page.locator('[data-bridge-scene-readout]'), clock = page.locator('#bridge-scene-time');
      async function check(inputs: GuideInputs, time: number, name: string, trial = 'current') {
        const point = oracle.bridgeSeismicSample(response(inputs), time), cm = point.relativeM * 100;
        await expect(hud).toHaveAttribute('data-scene-trial', trial);
        await expect(hud.locator('[data-scene-inspected-time]')).toHaveText(time.toFixed(3) + ' s');
        await expect(hud.locator('[data-scene-inspected-time]')).toHaveAttribute('data-scene-inspected-time', String(time));
        const phase = time >= 24 ? 'Observation ends' : time < 16 ? 'Shaking phase' : 'Free vibration';
        await expect(hud.locator('[data-bridge-scene-phase]')).toHaveText(phase);
        await expect(clock).toHaveAttribute('aria-valuetext', time.toFixed(3) + ' s / 24 s');
        const reading = hud.locator('[data-scene-relative-reading]');
        expect(Math.abs(Number(await reading.getAttribute('data-scene-relative-reading')) - cm)).toBeLessThanOrEqual(Math.abs(cm) * 1e-9 + 1e-30);
        await expect(reading.locator('strong')).toHaveText((cm > 0 ? '+' : '') + frameEnergyNumber(cm) + ' cm');
        const geometry = await reading.locator('strong').evaluate(node => {
          const b = node.getBoundingClientRect(), p = node.parentElement!.getBoundingClientRect();
          return { inside: b.left >= p.left && b.right <= p.right + 1, font: getComputedStyle(node).fontSize, whiteSpace: getComputedStyle(node).whiteSpace };
        });
        expect(geometry).toEqual({ inside: true, font: '14px', whiteSpace: 'nowrap' });
        expect(await hud.evaluate(node => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1);
        checks.push({ name, time, trial, cm, phase });
      }
      async function capture(name: string) {
        const row = hud.locator('[data-scene-relative-reading]');
        await row.scrollIntoViewIfNeeded();
        await expect(row).toBeVisible();
        await row.screenshot({ path: join(report, 'scene-readout-' + width + '-' + name + '.png') });
      }
      await check(normal, 7.217, 'initial');
      for (const time of [15.999, 16, 24]) {
        await page.evaluate(time => (window as any).__set({ seismicTime: time }), time);
        await check(normal, time, 'boundary-' + time);
      }
      await page.evaluate(() => (window as any).__set({ seismicTime: 7.217, seismicIntensityG: 1e-9 }));
      const tiny = { ...normal, intensityG: 1e-9 };
      await check(tiny, 7.217, 'tiny'); await capture('tiny');
      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 0 }));
      await check({ ...normal, intensityG: 0 }, 7.217, 'zero'); await capture('zero');
      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 1e-9, seismicSceneCompare: true,
        seismicSceneSource: 'saved', seismicReferenceIndex: 0, seismicSceneTrial: 'reference' }));
      await check(normal, 7.217, 'saved-a', 'reference'); await capture('saved-a');
      await page.getByRole('button', { name: 'B · current', exact: true }).click();
      await check(tiny, 7.217, 'current-b');
      await page.evaluate(() => (window as any).__set({ seismicReadoutCollapsed: true }));
      await expect(hud.locator('summary')).toContainText('7.217 s');
      await expect(hud.locator('[data-scene-relative-reading]')).toHaveCount(0);
      await page.evaluate(() => (window as any).__set({ seismicReadoutCollapsed: false, seismicSceneFocus: true }));
      await check(tiny, 7.217, 'focus-replay');
      await clock.focus(); await clock.press('End');
      await check(tiny, 24, 'focus-end');
      await page.evaluate(() => (window as any).__set({ seismicSceneFocus: false, seismicMotionGuide: true }));
      await expect(hud.locator('[data-scene-relative-reading]')).toHaveCount(0);
      expect(await page.evaluate(() => (window as any).__bucket())).toMatchObject({ seismicTrials: saved,
        seismicObservation: 'Keep my observation.', seismicIntervalPinS: 12.319, seismicPlaying: false });
      await checkWorkflowHealth(page);
      await writeFile(join(report, 'scene-readout-' + width + '-checks.json'), JSON.stringify(checks, null, 2));
    });
  }

  for (const width of [1000, 320]) {
    test('comparison readings: precise expanded and compact A/B values at ' + width + 'px', async ({ page }) => {
      test.setTimeout(240_000);
      const report = process.env.BRIDGE_CAPTURE_REPORT || ENHANCEMENT_REPORT;
      await mkdir(report, { recursive: true });
      const oracle = await loadFrameEnergyOracle(), cache = new Map<string, any>(), checks: any[] = [];
      function response(inputs: GuideInputs) { const key = JSON.stringify(inputs); if (!cache.has(key)) cache.set(key, oracle.bridgeSeismicResponse(inputs)); return cache.get(key); }
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await mountWorkflow(page, width, { bridgeView: 'immersive', bridgeObserver: 'bank', seismicEnabled: true,
        seismicGuideOpen: true, seismicTime: 7.217, seismicIntensityG: 1e-9,
        seismicObservation: 'Keep comparison evidence.', seismicIntervalPinS: 12.319 });
      await page.getByRole('button', { name: 'From the riverbank', exact: true }).click();
      await page.getByRole('button', { name: 'Prepare 5% / 20% comparison', exact: true }).click();
      await page.evaluate(() => (window as any).__set({ seismicTime: 7.217 }));
      const hud = page.locator('[data-bridge-scene-readout]');
      async function check(time: number, name: string, compact = false) {
        const pair = await guidePairInputs(page), values: number[] = [];
        const group = page.locator(compact ? '[data-bridge-compact-comparison]' : '[data-bridge-overlay-readings]');
        await expect(group).toHaveAttribute(compact ? 'data-bridge-compact-comparison' : 'data-bridge-overlay-readings', String(time));
        for (const [i, id] of ['reference', 'current'].entries()) {
          const p = oracle.bridgeSeismicSample(response(pair[i]), time), cm = p.relativeM * 100; values.push(cm);
          const row = group.locator('[' + (compact ? 'data-compact-response' : 'data-overlay-reading') + '="' + id + '"]');
          expect(Math.abs(Number(await row.getAttribute('data-relative-m')) - p.relativeM)).toBeLessThanOrEqual(Math.abs(p.relativeM) * 1e-9 + 1e-30);
          await expect(row.locator('strong')).toHaveText((cm > 0 ? '+' : '') + frameEnergyNumber(cm) + ' cm');
          await expect(row).toContainText(i === 0 ? 'A · reference' : 'B · current');
          const geometry = await row.locator('strong').evaluate(node => {
            const b = node.getBoundingClientRect(), p = node.parentElement!.getBoundingClientRect();
            return { inside: b.left >= p.left && b.right <= p.right + 1, font: getComputedStyle(node).fontSize, whiteSpace: getComputedStyle(node).whiteSpace };
          });
          expect(geometry).toEqual({ inside: true, font: '14px', whiteSpace: 'nowrap' });
        }
        expect(await hud.evaluate(node => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1);
        checks.push({ name, time, compact, values }); return values;
      }
      async function capture(name: string, compact = false) {
        const row = page.locator(compact ? '[data-compact-response="reference"]' : '[data-overlay-reading="reference"]');
        await row.scrollIntoViewIfNeeded();
        const visible = await row.evaluate(node => {
          const b = node.getBoundingClientRect(), p = node.closest('[data-bridge-scene-readout]')!.getBoundingClientRect();
          return b.top >= p.top && b.bottom <= p.bottom && b.top >= 0 && b.bottom <= innerHeight;
        });
        expect(visible).toBe(true);
        await row.screenshot({ path: join(report, 'comparison-readings-' + width + '-' + name + '.png') });
      }
      const tiny = await check(7.217, 'tiny-expanded'); expect(tiny.every(v => v !== 0 && Math.abs(v) < 0.001)).toBe(true); expect(tiny[0]).not.toBe(tiny[1]);
      await capture('tiny-expanded');
      await page.getByRole('button', { name: 'A · reference', exact: true }).click();
      expect(await check(7.217, 'selected-a')).toEqual(tiny);
      await page.evaluate(() => (window as any).__set({ seismicReadoutCollapsed: true }));
      expect(await check(7.217, 'tiny-compact', true)).toEqual(tiny); await capture('tiny-compact', true);
      await expect(hud.locator('summary')).toHaveAttribute('aria-describedby', 'bridge-scene-compact-comparison');
      await expect(page.locator('[data-compact-response="reference"]')).toContainText('solid');
      await expect(page.locator('[data-compact-response="current"]')).toContainText('outline');
      await page.evaluate(() => (window as any).__set({ seismicReadoutCollapsed: false, seismicIntensityG: 0 }));
      await page.getByRole('button', { name: 'Prepare 5% / 20% comparison', exact: true }).click();
      await page.evaluate(() => (window as any).__set({ seismicTime: 7.217 }));
      expect(await check(7.217, 'zero')).toEqual([0, 0]); await capture('zero');
      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 0.12 }));
      await page.getByRole('button', { name: 'Prepare 5% / 20% comparison', exact: true }).click();
      await page.evaluate(() => (window as any).__set({ seismicTime: 7.217 }));
      await check(7.217, 'ordinary');
      for (const time of [0, 16, 24]) { await page.evaluate(time => (window as any).__set({ seismicTime: time }), time); await check(time, 'time-' + time); }
      await page.evaluate(() => (window as any).__set({ seismicReadoutCollapsed: true }));
      await check(24, 'end-compact', true);
      expect(await page.evaluate(() => (window as any).__bucket())).toMatchObject({ seismicObservation: 'Keep comparison evidence.', seismicIntervalPinS: 12.319, seismicPlaying: false });
      await checkWorkflowHealth(page);
      await writeFile(join(report, 'comparison-readings-' + width + '-checks.json'), JSON.stringify(checks, null, 2));
    });
  }

  for (const width of [1000, 320]) {
    test('motion texture: readable deck and ground diagram at ' + width + 'px', async ({ page }) => {
      test.setTimeout(180_000);
      const report = process.env.BRIDGE_CAPTURE_REPORT || ENHANCEMENT_REPORT;
      await mkdir(report, { recursive: true });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await mountWorkflow(page, width, { bridgeView: 'immersive', bridgeObserver: 'bank', seismicEnabled: true,
        seismicMotionGuide: true, seismicTime: 7.217, seismicIntervalPinS: 12.319, seismicEnergyInterval: true,
        seismicObservation: 'Keep my motion evidence.' });
      await page.getByRole('button', { name: 'From the riverbank', exact: true }).click();
      async function check(origin: string, name: string) {
        const guide = page.locator('[data-bridge-motion-guide="' + origin + '"]');
        const frame = guide.locator('[data-motion-frame]'), figure = frame.locator('[data-motion-position-diagram]');
        await checkMotionPositionDiagram(frame);
        await expect(figure.locator('[data-motion-position-lane]')).toHaveCount(2);
        const geometry = await figure.evaluate(node => {
          const main = node.querySelector('[data-motion-position-svg]')!;
          return { lanes: [...node.querySelectorAll('[data-motion-position-lane]')].map(n => ({ y: n.getAttribute('y'), width: n.getAttribute('width'), height: n.getAttribute('height') })),
            bodies: [...node.querySelectorAll('[data-motion-position-body]')].map(n => ({ id: n.getAttribute('data-motion-position-body'), transform: n.getAttribute('transform'),
              lines: n.querySelectorAll('[data-motion-position-texture] line').length, rects: n.querySelectorAll('rect').length })),
            labelFont: getComputedStyle(node.querySelector('[data-motion-position-labels]')!).fontSize,
            hidden: main.getAttribute('aria-hidden'), overflow: node.scrollWidth - node.clientWidth };
        });
        expect(geometry.lanes).toEqual([{ y: '8', width: '400', height: '30' }, { y: '48', width: '400', height: '30' }]);
        expect(geometry.bodies.map(b => ({ id: b.id, lines: b.lines, rects: b.rects }))).toEqual([{ id: 'deck', lines: 6, rects: 1 }, { id: 'ground', lines: 6, rects: 1 }]);
        expect(geometry.labelFont).toBe('12px'); expect(geometry.hidden).toBe('true'); expect(geometry.overflow).toBeLessThanOrEqual(1);
        const before = await page.evaluate(() => (window as any).__bucket());
        await figure.scrollIntoViewIfNeeded();
        await expect.poll(async () => figure.evaluate(node => {
          const b = node.getBoundingClientRect();
          for (let p = node.parentElement; p; p = p.parentElement) {
            if (!/auto|scroll|hidden|clip/.test(getComputedStyle(p).overflowY)) continue;
            const r = p.getBoundingClientRect(); if (b.top < r.top || b.bottom > r.bottom) return false;
          }
          return b.top >= 0 && b.bottom <= innerHeight;
        })).toBe(true);
        await figure.screenshot({ path: join(report, 'motion-texture-' + width + '-' + name + '.png') });
        expect(await page.evaluate(() => (window as any).__bucket())).toEqual(before);
      }
      // Capture the diagram outside the constrained scene drawer at each viewport.
      await page.getByRole('button', { name: 'Labelled 2D view', exact: true }).click();
      await check('fallback', 'moving');
      await page.evaluate(() => (window as any).__set({ seismicTime: 0, seismicIntervalPinS: 0 }));
      await check('fallback', 'rest');
      await page.evaluate(() => (window as any).__set({ seismicTime: 7.217, seismicIntervalPinS: 12.319, seismicIntensityG: 1e-9 }));
      await check('fallback', 'tiny');
      await page.getByRole('button', { name: 'From the riverbank', exact: true }).click();
      const scene = page.locator('[data-bridge-motion-guide="scene"] [data-motion-frame]');
      await checkMotionPositionDiagram(scene);
      await expect(scene.locator('[data-motion-position-texture]')).toHaveCount(2);
      expect(await page.evaluate(() => (window as any).__bucket())).toMatchObject({ seismicObservation: 'Keep my motion evidence.', seismicIntervalPinS: 12.319 });
      await checkWorkflowHealth(page);
    });
  }

  for (const width of [1000, 320]) {
    test('mode inspection: turn mode results into exact observations at ' + width + 'px', async ({ page }) => {
      test.setTimeout(240_000);
      const report = process.env.BRIDGE_CAPTURE_REPORT || ENHANCEMENT_REPORT;
      await mkdir(report, { recursive: true });
      const oracle = await loadFrameEnergyOracle();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await mountWorkflow(page, width, { bridgeView: 'immersive', bridgeObserver: 'bank', bridgeBankYaw: 18, bridgeBankPitch: -8,
        bridgeWalkPos: 0.63, bridgeLookYaw: 27, bridgeLookPitch: -12, seismicEnabled: true, seismicGuideOpen: true,
        seismicFrequencyHz: 1.1, seismicIntensityG: 0.12, seismicDampingRatio: 0.05, seismicTime: 7.217,
        seismicEnergyInterval: true, seismicIntervalPinS: 12.319, seismicTrialName: 'Keep recorded trial',
        seismicPrediction: 'Predict the mode.', seismicObservation: 'Keep my explanation.',
        seismicScenePrediction: 'Keep scene prediction.', seismicSceneNote: 'Keep scene note.', seismicGuidePrediction: 'Keep guide prediction.' });
      await page.getByRole('button', { name: 'From the riverbank', exact: true }).click();
      await page.getByRole('button', { name: 'Save earthquake trial', exact: true }).click();
      await page.getByRole('button', { name: 'Prepare 5% / 20% comparison', exact: true }).click();
      await page.getByRole('button', { name: 'Record paired evidence', exact: true }).click();
      const comparison = page.locator('[data-mode-comparison]'), readout = page.locator('[data-bridge-seismic-readout]');
      const names = { flexible: 'Flexible response', balanced: 'Intermediate response', stiff: 'Stiffer response' };
      function close(actual: number, expected: number) { if (expected === 0) expect(actual).toBe(0); else expect(Math.abs(actual - expected)).toBeLessThanOrEqual(Math.abs(expected) * 2e-9); }
      async function bucket() { return page.evaluate(() => (window as any).__bucket()); }
      function maximum(response: any, measure: string) {
        const field = measure === 'relative' ? 'relativeM' : 'absoluteAccelerationMps2';
        const point = response.samples.reduce((best: any, sample: any) => Math.abs(sample[field]) > Math.abs(best[field]) ? sample : best, response.samples[0]);
        return { point, magnitude: Math.abs(point[field] * (measure === 'relative' ? 100 : 1 / 9.80665)) };
      }
      async function inspect(mode: keyof typeof names, measure: 'relative' | 'acceleration', index: number) {
        await page.evaluate(() => (window as any).__set({ seismicSceneTrial: 'reference', seismicTime: 7.217 }));
        const before = await bucket();
        const response = oracle.bridgeSeismicResponse({ archetype: mode, groundFrequencyHz: before.seismicFrequencyHz,
          intensityG: before.seismicIntensityG, dampingRatio: before.seismicDampingRatio });
        const max = maximum(response, measure);
        const button = comparison.locator('[data-response-mode="' + mode + '"] [data-mode-peak-inspect="' + measure + '"]');
        await expect(button).toBeEnabled(); await expect(button).toHaveAttribute('aria-describedby', 'bridge-mode-inspection-help');
        expect(Number(await button.getAttribute('data-mode-peak-time'))).toBe(max.point.timeS);
        close(Number(await button.getAttribute('data-mode-peak-magnitude')), max.magnitude);
        await expect(button).toContainText(max.point.timeS.toFixed(3) + ' s');
        if (index % 3 === 0) { await button.focus(); await button.press('Enter'); }
        else if (index % 3 === 1) { await button.focus(); await button.press('Space'); }
        else await button.click();
        expect(await bucket()).toEqual({ ...before, seismicArchetype: mode, seismicTime: max.point.timeS,
          seismicSceneTrial: 'current', seismicPlaying: false, autoDriving: false });
        await expect(readout).toBeFocused();
        await expect(readout.locator('[data-moment-readout-caption]')).toContainText(names[mode]);
        expect(Number(await readout.getAttribute('data-current-moment'))).toBe(max.point.timeS);
        close(Number(await readout.locator('[data-moment-reading="relative"] dd').getAttribute('data-moment-value')), max.point.relativeM * 100);
        close(Number(await readout.locator('[data-moment-reading="acceleration"] dd').getAttribute('data-moment-value')), max.point.absoluteAccelerationMps2 / 9.80665);
        await expect(button).toHaveAttribute('data-mode-peak-active', 'true');
        const box = await readout.boundingBox(); expect(box!.y).toBeGreaterThanOrEqual(0);
        expect(box!.y + box!.height).toBeLessThanOrEqual(page.viewportSize()!.height + 1);
      }
      async function capture(locator: import('@playwright/test').Locator, name: string) {
        const viewport = page.viewportSize()!, before = await bucket(), initial = await locator.boundingBox();
        try {
          await page.setViewportSize({ width: viewport.width, height: Math.max(viewport.height, Math.ceil(initial!.height) + 1500) });
          await expect.poll(() => locator.evaluate(async node => {
            const settle = () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
            await settle(); node.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }); await settle();
            const b = node.getBoundingClientRect();
            for(let p=node.parentElement;p;p=p.parentElement) { if(!/auto|scroll|hidden|clip/.test(getComputedStyle(p).overflowY))continue;
              const r=p.getBoundingClientRect(); if(b.top<r.top||b.bottom>r.bottom)return false; }
            return b.top>=0&&b.bottom<=innerHeight&&node.scrollWidth-node.clientWidth<=1;
          })).toBe(true);
          await locator.screenshot({ path: join(report, 'mode-inspection-' + width + '-' + name + '.png') });
        } finally { await page.setViewportSize(viewport); }
        expect(await bucket()).toEqual(before);
      }
      await expect(comparison.locator('[data-mode-peak-inspect]')).toHaveCount(6);
      await expect(comparison.locator('[data-mode-inspection-help]')).toContainText('finer calculation steps');
      let i=0;for(const mode of ['flexible','balanced','stiff'] as const)for(const measure of ['relative','acceleration'] as const)await inspect(mode,measure,i++);
      await page.getByRole('button', { name: 'Labelled 2D view', exact: true }).click();
      for(const mode of ['flexible','balanced','stiff'] as const)for(const measure of ['relative','acceleration'] as const)await inspect(mode,measure,i++);
      await capture(comparison, 'results'); await capture(readout, 'observation');
      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 0 }));
      const zero = await bucket();
      for(const button of await comparison.locator('[data-mode-peak-inspect]').all()) { await expect(button).toBeDisabled(); await expect(button).not.toHaveAttribute('data-mode-peak-time', /./); }
      await comparison.locator('[data-mode-peak-inspect]').evaluateAll(nodes => nodes.forEach(n => (n as HTMLButtonElement).click()));
      expect(await bucket()).toEqual(zero); await capture(comparison, 'zero');
      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 1e-9 }));
      for(const mode of ['flexible','balanced','stiff'] as const)for(const measure of ['relative','acceleration'] as const)await inspect(mode,measure,i++);
      await checkWorkflowHealth(page);
    });
  }

  test('draws BOTH truss planes, not the one the elevation showed', async ({ page }) => {
    await mount(page, { span: 30, height: 6, nBays: 4, trussStyle: 'warren' });
    const gl = await page.evaluate(() => (window as any).__gl());
    expect(gl.state).toBe('ready');
    expect(gl.contextLost).toBe(false);
    expect(gl.trussPlanes).toBe(2);
    // Warren, 4 bays: 4 bottom chord + 3 top chord + 8 diagonals = 15 members,
    // doubled across the two planes.
    expect(gl.memberCount).toBe(30);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('has a deck and spans the real width of the bridge', async ({ page }) => {
    await mount(page, { span: 30, height: 6, nBays: 4 });
    const gl = await page.evaluate(() => (window as any).__gl());
    expect(gl.deckPresent).toBe(true);
    expect(gl.extent.w).toBe(30);
    expect(gl.extent.h).toBe(6);
    expect(gl.extent.d).toBeGreaterThan(4);   // two planes, a walkable deck between
  });

  test('bracing slider changes how much bracing is drawn', async ({ page }) => {
    await mount(page, { span: 40, height: 5, nBays: 6, lateralBraceEvery: 1 });
    const tight = await page.evaluate(() => (window as any).__gl().braceCount);
    await page.evaluate(() => (window as any).__set({ lateralBraceEvery: 3 }));
    await page.waitForTimeout(500);
    const loose = await page.evaluate(() => (window as any).__gl().braceCount);
    expect(tight).toBeGreaterThan(loose);
    expect(loose).toBeGreaterThan(0);
  });

  test('★ removing bracing really fails the buckling check', async ({ page }) => {
    // This is the point of the whole change. The tool told students to "add
    // lateral bracing"; until now nothing in the model could hear them.
    await mount(page, { span: 36, height: 6, nBays: 6, crossSectionMm2: 14000, lateralBraceEvery: 1 });
    const braced = await page.evaluate(() => (window as any).__text());

    await page.evaluate(() => (window as any).__set({ lateralBraceEvery: 6 }));
    await page.waitForTimeout(500);
    const unbraced = await page.evaluate(() => (window as any).__text());

    expect(braced).not.toContain('BUCKLING FAILURE');
    expect(unbraced).toContain('BUCKLING FAILURE');
    // And it must say WHICH way it is buckling — the sideways mode is the one
    // the elevation could never show.
    expect(unbraced).toContain('buckling SIDEWAYS');
  });

  test('★ the default braces every panel, preserving the previous numbers', async ({ page }) => {
    // Back-compat. With bracing at every joint the out-of-plane length equals
    // the in-plane length, so the Euler check is arithmetically unchanged from
    // before this feature existed and a saved design cannot silently start
    // failing. The tell is the "SIDEWAYS" wording: it appears only when the
    // governing length came from brace spacing rather than the member itself.
    //
    // Note this design DOES buckle, and did before this change too — the stock
    // 30 m / 5000 mm² starting point is deliberately under-built so students
    // have something to fix. What must not change is WHY it buckles.
    // Mounted with NO lateralBraceEvery key at all — the back-compat case, a
    // design saved before this feature existed.
    await mount(page, { span: 30, height: 6, nBays: 4, crossSectionMm2: 5000 });
    expect(await page.evaluate(() => (window as any).__bucket().lateralBraceEvery)).toBeUndefined();
    const txt = await page.evaluate(() => (window as any).__text());
    expect(txt).not.toContain('buckling SIDEWAYS');
    // It buckles, but in-plane — i.e. governed by the member's own length, which
    // is exactly what the pre-change code computed.
    expect(await page.evaluate(() => (window as any).__gl().bowedAxis)).toBe('in-plane');
  });

  test('the failed member is drawn bowed, and only when it fails', async ({ page }) => {
    await mount(page, { span: 36, height: 6, nBays: 6, crossSectionMm2: 14000, lateralBraceEvery: 1 });
    expect(await page.evaluate(() => (window as any).__gl().bowedMember)).toBeNull();
    await page.evaluate(() => (window as any).__set({ lateralBraceEvery: 6 }));
    await page.waitForTimeout(500);
    const gl = await page.evaluate(() => (window as any).__gl());
    expect(gl.bowedMember).toBeTruthy();
    expect(String(gl.bowedMember)).toMatch(/^TC/);   // a top chord, as the physics says
    // And it bows the way it actually failed, not just some way.
    expect(gl.bowedAxis).toBe('out-of-plane');
    expect(gl.bowedInterval).toEqual({ startM: 3, endM: 33 });
    expect(gl.bowedMembers).toEqual(['TC0', 'TC1', 'TC2', 'TC3', 'TC4']);
    await expect(page.locator('[aria-describedby="bridge-gl-description"]')).toHaveAttribute('aria-label', /deformation is exaggerated/);
    await mkdir(ENHANCEMENT_REPORT, { recursive: true });
    await captureRegion(page, page.locator('[data-allo-fs-stage]'), 'bridge-buckled-interval.png');
  });

  test('the elevation survives underneath as the guaranteed floor', async ({ page }) => {
    await mount(page, { span: 30, height: 6, nBays: 4 });
    // Hidden with visibility, never removed — exports and DOM queries still work.
    expect(await page.evaluate(() => (window as any).__svgCount())).toBeGreaterThan(0);
  });

  test('the loading overlay actually goes away', async ({ page }) => {
    // The viewer status flips asynchronously, long after the render that mounted
    // it. Nothing in React was watching, so the overlay sat on top of a working
    // canvas — a dead overlay that every other test in this file would pass
    // straight through, because the scene underneath was genuinely fine.
    await mount(page, { span: 30, height: 6, nBays: 4 });
    expect(await page.evaluate(() => (window as any).__text())).not.toContain('Loading 3D view');
    // And the affordance it replaces is really offered.
    expect(await page.evaluate(() => (window as any).__text())).toContain('Drag');
  });

  test('every truss style builds without throwing', async ({ page }) => {
    await mount(page, { span: 36, height: 6, nBays: 6, trussStyle: 'warren' });
    for (const style of ['pratt', 'howe', 'ktruss', 'warren']) {
      await page.evaluate((s) => (window as any).__set({ trussStyle: s }), style);
      await page.waitForTimeout(350);
      const gl = await page.evaluate(() => (window as any).__gl());
      expect(gl.state, `style ${style}`).toBe('ready');
      expect(gl.contextLost, `style ${style}`).toBe(false);
      if (style === 'ktruss') {
        const description = await page.locator('[aria-describedby="bridge-gl-description"]').getAttribute('aria-label');
        expect(description).toContain('forces are not solved');
        expect(description).not.toContain('drawn bowed');
      }
    }
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('drag orbits the camera, which the overlay claims', async ({ page }) => {
    await mount(page, { span: 30, height: 6, nBays: 4 });
    const before = await page.evaluate(() => (window as any).__bucket().rot3d);
    await page.evaluate(() => {
      const c = document.querySelector('canvas[data-bridge-gl="true"]') as HTMLCanvasElement;
      const host = c.parentElement as HTMLElement;
      const r = host.getBoundingClientRect();
      const mk = (t: string, x: number, y: number) =>
        new PointerEvent(t, { clientX: x, clientY: y, bubbles: true, cancelable: true, pointerId: 1 });
      host.dispatchEvent(mk('pointerdown', r.left + r.width / 2, r.top + r.height / 2));
      host.dispatchEvent(mk('pointermove', r.left + r.width / 2 + 90, r.top + r.height / 2));
      host.dispatchEvent(mk('pointerup', r.left + r.width / 2 + 90, r.top + r.height / 2));
    });
    await page.waitForTimeout(400);
    const after = await page.evaluate(() => (window as any).__bucket().rot3d);
    expect(after.rotY).toBeGreaterThan((before?.rotY ?? 26) + 10);
  });

  test('changing the span does not remount the canvas', async ({ page }) => {
    await mount(page, { span: 30, height: 6, nBays: 4 });
    for (const span of [36, 44, 52]) {
      await page.evaluate((s) => (window as any).__set({ span: s }), span);
      await page.waitForTimeout(200);
    }
    expect(await page.evaluate(() => (window as any).__canvasCount())).toBe(1);
    const gl = await page.evaluate(() => (window as any).__gl());
    expect(gl.state).toBe('ready');
    expect(gl.extent.w).toBe(52);
  });

  test('tears the renderer down on unmount', async ({ page }) => {
    await mount(page, { span: 30, height: 6, nBays: 4 });
    await page.evaluate(() => (window as any).__destroy());
    await page.waitForTimeout(400);
    expect(await page.evaluate(() => (window as any).__gl().state)).toBe('idle');
  });

  for (const width of [1000, 390, 320]) {
    test(`enhanced workflow: inspect, sweep, compare and restore at ${width}px`, async ({ page }) => {
      await mountWorkflow(page, width, {
        span: 36, height: 6, nBays: 6, crossSectionMm2: 14000,
        lateralBraceEvery: 1, loadMode: 'vehicle', vehiclePos: 0.2,
        designName: 'Baseline bridge', designNotes: 'Compare one change at a time.'
      });
      const canvas = page.locator('canvas[data-bridge-gl="true"]');
      await expect(canvas).toBeVisible();
      await page.screenshot({ path: join(ENHANCEMENT_REPORT, `bridge-${width}-overview.png`) });

      await page.getByRole('button', { name: 'Labelled 2D view', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Labelled 2D view', exact: true })).toHaveAttribute('aria-pressed', 'true');
      await expect(page.getByRole('img', { name: /^Warren truss diagram/ })).toBeVisible();
      await page.getByLabel('Inspect member', { exact: true }).selectOption('BC0');
      await expect(page.locator('[data-bridge-inspector] [role="status"]')).toContainText('BC0');
      await expect(page.locator('[data-bridge-member="BC0"] text')).toHaveText('BC0');
      await page.locator('[data-bridge-inspector] summary').click();
      await expect(page.getByRole('region', { name: 'Member force table', exact: true })).toBeVisible();
      await captureRegion(page, page.locator('[data-bridge-inspector]'), `bridge-${width}-inspector.png`);
      await captureRegion(page, page.getByRole('img', { name: /^Warren truss diagram/ }), `bridge-${width}-elevation.png`);

      await page.getByRole('button', { name: 'Test all positions', exact: true }).click();
      await expect(page.locator('[data-bridge-sweep]')).toContainText('Lowest safety factor across the crossing:');
      const sweep = await page.evaluate(() => (window as any).__bucket().vehicleSweep);
      expect(sweep.samples.length).toBeGreaterThanOrEqual(51);
      expect(sweep.worst.sf).toBeGreaterThan(0);
      await page.getByRole('button', { name: 'Inspect worst position', exact: true }).click();
      await expect.poll(() => page.evaluate(() => (window as any).__bucket().vehiclePos)).toBe(sweep.worst.position);
      await captureRegion(page, page.locator('[data-bridge-sweep]'), `bridge-${width}-sweep.png`);

      await page.getByRole('button', { name: 'Save current design', exact: true }).click();
      await expect(page.locator('[data-bridge-notebook] article')).toHaveCount(1);
      const baseline = await page.evaluate(() => (window as any).__bucket().designTrials[0].inputs);
      const area = page.getByRole('slider', { name: 'Member cross-section (mm²)', exact: true });
      await area.focus();
      await area.press('ArrowRight');
      await expect.poll(() => page.evaluate(() => (window as any).__bucket().crossSectionMm2)).toBe(14500);
      await expect(page.locator('[data-bridge-sweep]')).toContainText('The design changed. Run the crossing test again');
      await expect(page.getByRole('button', { name: 'Inspect worst position', exact: true })).toHaveCount(0);
      await page.getByRole('textbox', { name: 'Bridge design name', exact: true }).fill('Thicker section');
      await page.getByRole('button', { name: 'Save current design', exact: true }).click();
      await expect(page.locator('[data-bridge-notebook] article')).toHaveCount(2);
      await page.getByRole('button', { name: 'Restore Baseline bridge', exact: true }).click();
      await expect.poll(() => page.evaluate(() => (window as any).__bucket().crossSectionMm2)).toBe(baseline.crossSectionMm2);
      await expect.poll(() => page.evaluate(() => (window as any).__bucket().vehiclePos)).toBe(baseline.vehiclePos);
      await expect(page.getByRole('textbox', { name: 'Bridge design notes', exact: true })).toHaveValue('Compare one change at a time.');
      await captureRegion(page, page.locator('[data-bridge-notebook]'), `bridge-${width}-notebook.png`);
      await checkWorkflowHealth(page);
    });
  }

  test('enhanced workflow: auto-drive visibly updates the vehicle and pauses on manual input', async ({ page }) => {
    await mountWorkflow(page, 1000, { loadMode: 'vehicle', vehiclePos: 0, introDismissed: true });
    await page.getByRole('button', { name: 'Labelled 2D view', exact: true }).click();
    const elevation = page.getByRole('img', { name: /^Warren truss diagram/ });
    const before = await elevation.textContent();
    await page.getByRole('button', { name: 'Auto-Drive Vehicle Across Bridge' }).click();
    await expect.poll(() => page.evaluate(() => (window as any).__bucket().vehiclePos)).toBeGreaterThan(0.1);
    await expect(page.getByRole('button', { name: 'Stop Drive' })).toHaveAttribute('aria-pressed', 'true');
    expect(await elevation.textContent()).not.toBe(before);
    const position = page.getByRole('slider', { name: 'Vehicle position (0=left, 1=right)', exact: true });
    await position.focus();
    await position.press('End');
    await expect.poll(() => page.evaluate(() => (window as any).__bucket().autoDriving)).toBe(false);
    const stopped = await page.evaluate(() => (window as any).__bucket().vehiclePos);
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => (window as any).__bucket().vehiclePos)).toBe(stopped);
    await checkWorkflowHealth(page);
  });

  for (const width of [1000, 390, 320]) {
    test(`crossing evidence: optimize, inspect with keyboard and print a saved trial at ${width}px`, async ({ page }) => {
      await mountWorkflow(page, width, {
        span: 36, height: 6, nBays: 6, crossSectionMm2: 14000,
        lateralBraceEvery: 1, loadMode: 'vehicle', vehiclePos: 0, vehicleLoad: 120
      });
      const optimizer = page.locator('[data-bridge-optimizer]');
      await expect(page.getByRole('combobox', { name: 'Positions to optimize', exact: true })).toHaveValue('crossing');
      await expect(optimizer).not.toContainText('An unloaded design cannot establish');
      await page.getByRole('button', { name: 'Apply this design to my bridge', exact: true }).click();
      const applied = await page.evaluate(() => (window as any).__bucket());
      expect(applied.vehiclePos).toBe(0);
      const sweep = applied.vehicleSweep;
      expect(sweep.worst.sf).toBeGreaterThanOrEqual(applied.optTargetSF || 2);
      expect(sweep.samples.some((sample: any) => sample.position > 0 && sample.position < 1 && sample.sf !== null)).toBe(true);
      expect(sweep.memberExtremes.length).toBe(23);
      await captureRegion(page, optimizer, `bridge-${width}-optimizer.png`);

      const worst = page.getByRole('button', { name: 'Inspect worst position', exact: true });
      await worst.focus();
      await worst.press('Enter');
      const member = page.getByLabel('Inspect member', { exact: true });
      await expect(member).toBeFocused();
      await expect(member).toHaveValue(sweep.worst.member);
      await expect(page.getByRole('button', { name: 'Labelled 2D view', exact: true })).toHaveAttribute('aria-pressed', 'true');
      await expect.poll(() => page.evaluate(() => (window as any).__bucket().vehiclePos)).toBe(sweep.worst.position);

      const reversed = sweep.memberExtremes.find((item: any) => item.tensionKN > 0.001 && item.compressionKN > 0.001);
      expect(reversed, 'A Warren diagonal reverses action during this crossing').toBeTruthy();
      await member.selectOption(reversed.id);
      const extremes = page.locator('[data-bridge-member-crossing]');
      await expect(extremes).toContainText('Force reversal');
      await expect(extremes).toContainText(`Maximum tension: ${reversed.tensionKN.toFixed(2)} kN`);
      await expect(extremes).toContainText(`Maximum compression: ${reversed.compressionKN.toFixed(2)} kN`);
      await extremes.getByRole('button', { name: `Inspect position ${(reversed.compressionPosition * 100).toFixed(1)}%`, exact: true }).click();
      await expect(member).toBeFocused();
      await expect(page.locator('[data-bridge-inspector] [role="status"]')).toContainText('Compression');
      await captureRegion(page, page.locator('[data-bridge-inspector]'), `bridge-${width}-member-extremes.png`);

      const resultsToggle = page.locator('[data-bridge-sweep] summary');
      await resultsToggle.focus();
      await resultsToggle.press('Enter');
      const results = page.getByRole('region', { name: 'Crossing results table', exact: true });
      await results.focus();
      await expect(results).toBeFocused();
      await expect(results.getByRole('row')).toHaveCount(sweep.samples.length + 1);
      const tested = sweep.samples.find((sample: any) => sample.position > 0.3 && sample.position < 0.4);
      const positionButton = results.getByRole('button', { name: `Inspect position ${(tested.position * 100).toFixed(1)}%`, exact: true });
      await positionButton.focus();
      await positionButton.press('Enter');
      await expect(member).toBeFocused();
      await expect(member).toHaveValue(tested.member);
      await expect.poll(() => page.evaluate(() => (window as any).__bucket().vehiclePos)).toBe(tested.position);
      const position = page.getByRole('slider', { name: /^Inspect vehicle position/ });
      await position.focus();
      await position.press('Home');
      await position.press('ArrowRight');
      await expect.poll(() => page.evaluate(() => (window as any).__bucket().vehiclePos)).toBe(0.01);
      await expect(position).toHaveAttribute('aria-valuetext', /^1\.0%; SF /);
      await resultsToggle.press('Enter');
      await captureRegion(page, page.locator('[data-bridge-sweep]'), `bridge-${width}-crossing-controls.png`);

      const prediction = 'I predict that a thicker section will improve the buckling margin because bending stiffness increases.';
      const observation = 'The whole crossing met the target. A diagonal changed from tension to compression as the vehicle moved.';
      await page.getByRole('textbox', { name: 'Bridge design name', exact: true }).fill('Crossing investigation');
      await page.getByRole('textbox', { name: 'Design prediction', exact: true }).fill(prediction);
      await page.getByRole('textbox', { name: 'Design observation', exact: true }).fill(observation);
      await page.getByRole('button', { name: 'Save current design', exact: true }).click();
      const trial = page.locator('[data-bridge-notebook] article');
      await expect(trial).toHaveCount(1);
      await expect(trial).toContainText(prediction);
      await expect(trial).toContainText(observation);
      await expect(trial).toContainText('Saved crossing: SF');
      await captureRegion(page, page.locator('[data-bridge-notebook]'), `bridge-${width}-evidence-notebook.png`);
      await checkWorkflowHealth(page);

      await page.getByRole('button', { name: 'Open design report', exact: true }).click();
      await expect(page.locator('#bridge-print-region')).toBeVisible();
      const printedTrial = page.locator('[data-bridge-print-trial]');
      await expect(printedTrial).toContainText(prediction);
      await expect(printedTrial).toContainText(observation);
      await expect(printedTrial).toContainText('Saved crossing evidence');
      await expect(printedTrial).not.toContainText('No matching crossing test');
      await expect(page.locator('[data-bridge-print-crossing]')).toContainText('Current design crossing test');
      await captureRegion(page, page.locator('#bridge-print-region'), `bridge-${width}-portfolio.png`);
      await checkWorkflowHealth(page);
      if (width === 1000) {
        await page.emulateMedia({ media: 'print' });
        await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
        await page.pdf({ path: join(ENHANCEMENT_REPORT, 'bridge-evidence-portfolio.pdf'), format: 'A4', printBackground: true,
          margin: { top: '12mm', right: '12mm', bottom: '12mm', left: '12mm' } });
      }
    });
  }

  test('view recovery: WebGL loss moves focused controls to a persistent labelled 2D fallback', async ({ page }) => {
    await mountWorkflow(page, 1000, { loadMode: 'vehicle', vehiclePos: 0.3 });
    const viewer = page.locator('[aria-describedby="bridge-gl-description"]');
    await viewer.focus();
    await page.evaluate(() => {
      const canvas = document.querySelector('canvas[data-bridge-gl]') as HTMLCanvasElement;
      const context = canvas.getContext('webgl2') || canvas.getContext('webgl');
      const extension = context?.getExtension('WEBGL_lose_context');
      if (!extension) throw new Error('Chromium did not expose WEBGL_lose_context');
      (window as any).__bridgeRestoreContext = extension;
      extension.loseContext();
    });
    const fallback = page.locator('[data-bridge-elevation]');
    await expect(page.locator('[data-bridge-view-status]')).toBeVisible();
    await expect(page.locator('[data-bridge-view-status]')).toContainText('3D is unavailable');
    await expect(fallback).toBeFocused();
    await expect(page.getByRole('button', { name: '3D structure', exact: true })).toBeDisabled();
    await expect(page.getByRole('img', { name: /^Warren truss diagram/ })).toBeVisible();
    await page.evaluate(() => (window as any).__bridgeRestoreContext.restoreContext());
    await expect.poll(() => page.evaluate(() => (window as any).__gl().state)).toBe('ready');
    await expect(page.locator('[data-bridge-view-status]')).toContainText('3D is available again');
    await expect(fallback).toBeFocused();
    await expect(page.getByRole('button', { name: 'Labelled 2D view', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: '3D structure', exact: true }).click();
    await expect(viewer).toBeVisible();
    await expect(page.locator('[data-bridge-view-status]')).toHaveCount(0);
    await checkWorkflowHealth(page);
  });

  test('view recovery: failed 3D startup keeps the explanation and 2D controls available', async ({ page }) => {
    await page.goto(`${base}/__harness`);
    await page.evaluate(() => {
      (window as any).StemLab.ensureThree = () => Promise.reject(new Error('Test WebGL unavailable'));
      (window as any).__mount({ tab: 'build', introDismissed: true });
    });
    await expect(page.locator('[data-bridge-view-status]')).toBeVisible();
    await expect(page.locator('[data-bridge-view-status]')).toContainText('all analysis controls remain available');
    await expect(page.getByRole('img', { name: /^Warren truss diagram/ })).toBeVisible();
    await expect(page.getByRole('button', { name: '3D structure', exact: true })).toBeDisabled();
    await page.getByLabel('Inspect member', { exact: true }).selectOption('BC0');
    await expect(page.locator('[data-bridge-inspector] [role="status"]')).toContainText('BC0');
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('view recovery: keyboard orbit and view switching preserve explicit 2D selection', async ({ page }) => {
    await mountWorkflow(page, 1000);
    const viewer = page.locator('[aria-describedby="bridge-gl-description"]');
    await viewer.focus();
    await viewer.press('ArrowRight');
    await viewer.press('ArrowUp');
    await viewer.press('+');
    const rotated = await page.evaluate(() => (window as any).__bucket());
    expect(rotated.rot3d).toEqual({ rotY: 34, rotX: 20 });
    expect(rotated.zoom3d).toBeGreaterThan(1);
    const twoDimensional = page.getByRole('button', { name: 'Labelled 2D view', exact: true });
    await twoDimensional.focus();
    await twoDimensional.press('Enter');
    await expect(twoDimensional).toBeFocused();
    await expect(viewer).toHaveAttribute('tabindex', '-1');
    await expect(page.locator('[data-allo-fs-stage]')).toHaveAttribute('aria-hidden', 'true');
    await page.evaluate(() => (window as any).__set({ span: 40 }));
    await expect(twoDimensional).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('img', { name: /^Warren truss diagram/ })).toBeVisible();
    await checkWorkflowHealth(page);
  });

  for (const width of [1000, 320]) {
    test('bridge landscape: lighting, river views and bounded resources at ' + width + 'px', async ({ page }) => {
      const atmosphereReport = process.env.BRIDGE_REPORT_DIR || join(process.cwd(), 'reports', 'bridgelab-visual-depth-2026-10-05');
      const warnings: string[] = [];
      page.on('console', message => {
        const text = message.text();
        // Screenshot readback can emit this documented SwiftShader diagnostic.
        // Keep application warnings and all shader/context errors actionable.
        if (message.type() === 'warning' && text.includes('GL Driver Message (OpenGL, Performance,')
          && /GPU stall due to ReadPixels(?: \(this message will no longer repeat\))?$/.test(text)) return;
        if (message.type() === 'warning' || message.type() === 'error') warnings.push(text);
      });
      await mountWorkflow(page, width, { crossSectionMm2: 14500, span: 30 });
      const stage = page.locator('[data-allo-fs-stage]');
      await stage.scrollIntoViewIfNeeded();
      const initial = await page.evaluate(() => (window as any).__gl());
      expect(initial.shadowsEnabled).toBe(true);
      expect(initial.landscape).toMatchObject({ trees: 48, ridges: 4, shadowMapSize: 1024 });
      const atmosphere = initial.landscape.atmosphere;
      // Inspect the colors actually uploaded to the sky and river geometry.
      // The cloud field has a clear horizon and costs no additional texture.
      expect(atmosphere.skyVertices).toBe(1625);
      expect(atmosphere.skyTriangles - 528).toBeLessThan(3000);
      expect(atmosphere.cloudVertices).toBeGreaterThan(30);
      expect(atmosphere.cloudVertices).toBeLessThan(atmosphere.skyVertices / 2);
      expect(atmosphere.cloudOpacityMax).toBeGreaterThan(0.25);
      expect(atmosphere.cloudOpacityMax).toBeLessThanOrEqual(0.56);
      expect(atmosphere.cloudMinHeight).toBeGreaterThan(0.08);
      expect(atmosphere.riverGlintSegments).toBe(96);
      for (const ranges of [atmosphere.skyColorRange, atmosphere.riverColorRange]) {
        expect(ranges).toHaveLength(3);
        for (const [minimum, maximum] of ranges) {
          expect(Number.isFinite(minimum) && Number.isFinite(maximum)).toBe(true);
          expect(minimum).toBeGreaterThanOrEqual(0);
          expect(maximum).toBeLessThanOrEqual(1);
          expect(maximum - minimum).toBeGreaterThan(0.03);
        }
      }
      expect(initial.resources.textures).toBeGreaterThan(0);
      expect(initial.drawCalls).toBeLessThan(650);
      expect(initial.triangles).toBeLessThan(40000);
      await captureImmersiveRegion(page, stage, 'bridge-' + width + '-landscape-orbit.png', atmosphereReport);
      for (const span of [10, 80, 30, 60, 30]) {
        const previousBuild = await page.evaluate(() => (window as any).__gl().sceneBuilds);
        await page.evaluate(value => (window as any).__set({ span: value }), span);
        await expect.poll(() => page.evaluate(() => (window as any).__gl().sceneBuilds)).toBeGreaterThan(previousBuild);
        const resized = await page.evaluate(() => (window as any).__gl());
        expect(resized.resources.textures).toBe(initial.resources.textures);
        expect(resized.drawCalls).toBeLessThan(650);
        expect(resized.triangles).toBeLessThan(40000);
      }
      // Returning to the same design reconstructs exactly the same static
      // backdrop, even after smaller and larger bridges have been inspected.
      expect(await page.evaluate(() => (window as any).__gl().landscape.atmosphere)).toEqual(atmosphere);
      // The initial desktop-sized mount can upload objects that the narrower
      // phone camera later culls. Returning to the same span must not grow GPU use.
      expect(await page.evaluate(() => (window as any).__gl().resources.geometries)).toBeLessThanOrEqual(initial.resources.geometries);
      await page.getByRole('button', { name: 'On the bridge', exact: true }).click();
      await stage.scrollIntoViewIfNeeded();
      await expect.poll(() => page.evaluate(() => (window as any).__gl().cameraMode)).toBe('deck');
      const built = await page.evaluate(() => (window as any).__gl().sceneBuilds);
      const hint = stage.getByText('Deck view · Drag to look · ↑/↓ walk · Home reset', { exact: true });
      expect(await hint.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
      await captureImmersiveRegion(page, stage, 'bridge-' + width + '-landscape-walkway.png', atmosphereReport);
      await page.evaluate(() => (window as any).__set({ bridgeWalkPos: 0.5, bridgeLookYaw: 90, bridgeLookPitch: -8 }));
      await expect.poll(() => page.evaluate(() => (window as any).__gl().cameraDirection[2])).toBeGreaterThan(0.9);
      expect(await page.evaluate(() => (window as any).__gl().sceneBuilds)).toBe(built);
      await captureImmersiveRegion(page, stage, 'bridge-' + width + '-landscape-river.png', atmosphereReport);
      expect(await page.evaluate(() => (window as any).__gl().landscape.atmosphere)).toEqual(atmosphere);
      expect(await page.evaluate(() => (window as any).__gl().groundOffsetM)).toBe(0);
      expect(await page.evaluate(() => (window as any).__gl().deckOffsetM)).toBe(0);
      await page.getByRole('button', { name: 'From the riverbank', exact: true }).click();
      await stage.scrollIntoViewIfNeeded();
      await expect.poll(() => page.evaluate(() => (window as any).__gl().cameraMode)).toBe('bank');
      const bank = await page.evaluate(() => (window as any).__gl());
      expect(bank.observerAnchor).toBe('ground');
      expect(bank.sceneBuilds).toBe(built);
      expect(bank.landscape.atmosphere).toEqual(atmosphere);
      expect(bank.resources.textures).toBe(initial.resources.textures);
      expect(bank.drawCalls).toBeLessThan(650);
      expect(bank.triangles).toBeLessThan(40000);
      await captureImmersiveRegion(page, stage, 'bridge-' + width + '-landscape-bank.png', atmosphereReport);
      expect(warnings).toEqual([]);
      await checkWorkflowHealth(page);
    });
  }

  for (const width of [1000, 390]) {
    test(`immersive earthquake: walk, inspect energy and preserve static analysis at ${width}px`, async ({ page }) => {
      await mountWorkflow(page, width, { loadMode: 'vehicle', vehiclePos: 0.35, crossSectionMm2: 14500 });
      await mkdir(IMMERSIVE_REPORT, { recursive: true });
      const stage = page.locator('[data-allo-fs-stage]');
      const inspector = page.locator('[data-bridge-inspector]');
      const staticBefore = await inspector.textContent();
      await page.getByRole('button', { name: 'On the bridge', exact: true }).click();
      await stage.scrollIntoViewIfNeeded();
      await expect.poll(() => page.evaluate(() => (window as any).__gl().cameraMode)).toBe('deck');
      const onDeck = await page.evaluate(() => (window as any).__gl());
      expect(onDeck.roadwayPresent).toBe(true);
      expect(onDeck.railingsPresent).toBe(true);
      expect(onDeck.deckEyeHeightM).toBe(1.65);
      expect(onDeck.cameraDirection[0]).toBeGreaterThan(0.99);
      const viewer = page.locator('[aria-describedby="bridge-gl-description"]');
      await viewer.focus();
      await viewer.press('ArrowUp');
      await expect.poll(() => page.evaluate(() => (window as any).__bucket().bridgeWalkPos)).toBeCloseTo(0.145);
      await viewer.press('PageUp');
      await expect.poll(() => page.evaluate(() => (window as any).__bucket().bridgeLookPitch)).toBeGreaterThan(0);
      await viewer.press('Home');
      await expect.poll(() => page.evaluate(() => (window as any).__bucket().bridgeWalkPos)).toBe(0.12);
      const position = page.getByRole('slider', { name: 'Position on bridge (%)', exact: true });
      await position.focus();
      await position.press('ArrowRight');
      await stage.scrollIntoViewIfNeeded();
      await expect.poll(() => page.evaluate(() => (window as any).__gl().cameraPosition.x)).toBeGreaterThan(onDeck.cameraPosition.x);
      const look = page.getByRole('slider', { name: 'Look left or right (°)', exact: true });
      await look.focus();
      await look.press('ArrowRight');
      await stage.scrollIntoViewIfNeeded();
      await expect.poll(() => page.evaluate(() => (window as any).__gl().cameraDirection[2])).toBeGreaterThan(0);
      await captureImmersiveRegion(page, stage, `bridge-${width}-on-deck.png`);

      await page.getByRole('checkbox', { name: 'Earthquake experiment', exact: true }).check();
      const time = page.getByRole('slider', { name: 'Experiment time (s)', exact: true });
      await time.focus();
      await time.press('Home');
      await time.press('PageUp');
      await time.press('PageUp');
      await time.press('PageUp');
      await expect.poll(() => page.evaluate(() => (window as any).__bucket().seismicTime)).toBeGreaterThan(0);
      const energy = page.locator('[data-bridge-energy]');
      await expect(energy).toContainText('J/kg');
      await expect(energy).not.toContainText(/NaN|Infinity|undefined/);
      await expect(page.locator('[data-bridge-seismic-comparison] tbody tr')).toHaveCount(3);
      await expect.poll(() => inspector.textContent()).toBe(staticBefore);
      await stage.scrollIntoViewIfNeeded();
      await expect.poll(() => page.evaluate(() => Math.abs((window as any).__gl().relativeOffsetM))).toBeGreaterThan(0);
      const quake = await page.evaluate(() => (window as any).__gl());
      expect(quake.sceneBuilds).toBe(onDeck.sceneBuilds);
      expect(quake.deckOffsetM - quake.groundOffsetM).toBeCloseTo(quake.relativeOffsetM, 10);
      expect(quake.deckOffsetVisualM).toBeCloseTo(quake.deckOffsetM * quake.motionScale, 10);
      expect(quake.supportEndpoints.length).toBeGreaterThan(0);
      for (const support of quake.supportEndpoints) {
        expect(support.top.z - support.base.z).toBeCloseTo(quake.deckOffsetVisualM - quake.groundOffsetVisualM, 8);
      }
      expect(await page.evaluate(() => (window as any).__canvasCount())).toBe(1);
      await captureImmersiveRegion(page, stage, `bridge-${width}-on-deck-earthquake.png`);
      await captureImmersiveRegion(page, energy, `bridge-${width}-energy.png`);

      await page.getByRole('button', { name: '3D structure', exact: true }).click();
      await stage.scrollIntoViewIfNeeded();
      await expect.poll(() => page.evaluate(() => (window as any).__gl().cameraMode)).toBe('orbit');
      await captureImmersiveRegion(page, stage, `bridge-${width}-orbit-earthquake.png`);
      await page.getByRole('button', { name: 'Labelled 2D view', exact: true }).click();
      await expect(page.getByRole('img', { name: /^Warren truss diagram/ })).toBeVisible();
      await expect.poll(() => inspector.textContent()).toBe(staticBefore);
      await checkWorkflowHealth(page);
    });
  }

  for (const width of [1000, 320]) {
    test('earthquake investigation: inspect, save, compare, restore and print at ' + width + 'px', async ({ page }) => {
      await mkdir(INVESTIGATION_REPORT, { recursive: true });
      await mountWorkflow(page, width, { seismicEnabled: true, seismicDampingRatio: 0.05 });
      await page.getByRole('button', { name: 'Labelled 2D view', exact: true }).click();
      await page.getByRole('button', { name: 'Inspect peak motion', exact: true }).click();
      const recordedTime = await page.evaluate(() => (window as any).__bucket().seismicTime);
      expect(recordedTime).toBeGreaterThan(0);
      expect(await page.evaluate(() => (window as any).__bucket().seismicPlaying)).toBe(false);
      const mechanism = page.locator('[data-bridge-seismic-mechanism]');
      await expect(mechanism).toContainText('N/kg');
      const offsets = await mechanism.evaluate(element => ({
        deck: Number(element.querySelector('[data-seismic-deck-x]')?.getAttribute('data-seismic-deck-x')),
        ground: Number(element.querySelector('[data-seismic-ground-x]')?.getAttribute('data-seismic-ground-x'))
      }));
      expect(Math.abs(offsets.deck - offsets.ground)).toBeGreaterThan(20);
      await captureImmersiveRegion(page, mechanism, 'bridge-' + width + '-mechanism.png', INVESTIGATION_REPORT);
      await page.getByRole('textbox', { name: 'Earthquake trial name', exact: true }).fill('Near resonance');
      await page.getByRole('textbox', { name: 'Earthquake prediction', exact: true }).fill('More damping will reduce the peak motion.');
      await page.getByRole('textbox', { name: 'Earthquake observation and explanation', exact: true }).fill('The deck continues to move when ground shaking stops.');
      await page.getByRole('button', { name: 'Save earthquake trial', exact: true }).click();
      await expect(page.locator('[data-seismic-trial]')).toHaveCount(1);
      await page.locator('[data-bridge-seismic] summary').click();
      await page.getByRole('button', { name: 'Try 20% damping', exact: true }).click();
      const comparison = page.locator('[data-seismic-trial-comparison]');
      await expect(comparison).toContainText('Changed settings: Damping ratio (%)');
      const cells = await comparison.locator('tbody tr').first().locator('[data-seismic-cell-value]').allTextContents();
      expect(parseFloat(cells[1])).toBeLessThan(parseFloat(cells[0]));
      await page.getByRole('textbox', { name: 'Earthquake trial name', exact: true }).fill('Added damping');
      await page.getByRole('textbox', { name: 'Earthquake observation and explanation', exact: true }).fill('Peak relative motion is smaller with the same shaking.');
      await page.getByRole('button', { name: 'Inspect end of shaking', exact: true }).click();
      await page.getByRole('button', { name: 'Save earthquake trial', exact: true }).click();
      await expect(page.locator('[data-seismic-trial]')).toHaveCount(2);
      await captureImmersiveRegion(page, page.locator('[data-bridge-seismic-notebook]'), 'bridge-' + width + '-notebook.png', INVESTIGATION_REPORT);
      await checkWorkflowHealth(page);
      await page.getByRole('button', { name: 'Restore earthquake trial 1: Near resonance', exact: true }).click();
      await expect.poll(() => page.evaluate(() => (window as any).__bucket().seismicTime)).toBe(recordedTime);
      expect(await page.evaluate(() => (window as any).__bucket().seismicDampingRatio)).toBe(0.05);
      expect(await page.evaluate(() => (window as any).__bucket().seismicPlaying)).toBe(false);
      await expect(page.getByRole('textbox', { name: 'Earthquake observation and explanation', exact: true })).toHaveValue('The deck continues to move when ground shaking stops.');
      await page.getByRole('button', { name: 'Open earthquake evidence report', exact: true }).click();
      const report = page.locator('[data-bridge-print-seismic]');
      await expect(report.locator('[data-seismic-trial]')).toHaveCount(2);
      await expect(report).toContainText('Near resonance');
      await expect(report).toContainText('Added damping');
      // The report now lists energy as a labelled table of readings rather than one "(J/kg): a / b / c" sentence.
      await expect(report.locator('[data-seismic-saved-energy]').first()).toContainText('Energy at the inspected time');
      await expect(report.locator('[data-seismic-saved-energy]').first()).toContainText('J/kg');
      await expect(report.locator('input,textarea,button')).toHaveCount(0);
      await captureImmersiveRegion(page, report, 'bridge-' + width + '-earthquake-report.png', INVESTIGATION_REPORT);
      await checkWorkflowHealth(page);
    });
  }

  for (const width of [1000, 320]) {
    test('earthquake comparison: choose a reference, inspect shared curves and print at ' + width + 'px', async ({ page }) => {
      await mkdir(COMPARISON_REPORT, { recursive: true });
      await mountWorkflow(page, width, { seismicEnabled: true });
      await page.getByRole('button', { name: 'Inspect peak motion', exact: true }).click();
      await page.getByRole('textbox', { name: 'Earthquake trial name', exact: true }).fill('Reference: 5% damping');
      await page.getByRole('button', { name: 'Save earthquake trial', exact: true }).click();
      await page.locator('[data-bridge-seismic] summary').click();
      await page.getByRole('button', { name: 'Try 20% damping', exact: true }).click();
      const comparison = page.locator('[data-seismic-trial-comparison]');
      await expect(comparison).toContainText('Both trials use the same ground motion');
      const cells = await comparison.locator('tbody tr').first().locator('[data-seismic-cell-value]').allTextContents();
      expect(parseFloat(cells[1])).toBeLessThan(parseFloat(cells[0]));
      expect(parseFloat(cells[2])).toBeLessThan(0);
      await page.getByRole('button', { name: 'Compare on timeline', exact: true }).click();
      const chart = page.getByRole('slider', { name: 'Inspect earthquake timeline (s)', exact: true });
      await expect(chart).toBeFocused();
      await chart.press('Home');
      for (let i = 0; i < 8; i++) await chart.press('PageUp');
      await expect(page.locator('[data-seismic-compare-frame]')).toHaveAttribute('data-seismic-compare-frame', '8');
      const timeline = page.locator('[data-bridge-seismic-timeline]');
      await expect(timeline).toHaveAttribute('data-bridge-seismic-timeline', 'comparison');
      await expect(timeline.locator('[data-seismic-comparison-curves] polyline')).toHaveCount(2);
      await captureImmersiveRegion(page, timeline, 'bridge-' + width + '-comparison-motion.png', COMPARISON_REPORT);
      await page.getByRole('combobox', { name: 'Comparison measure', exact: true }).selectOption('acceleration');
      await expect(page.locator('[data-seismic-comparison-curves]')).toHaveAttribute('data-seismic-comparison-curves', 'acceleration');
      await expect(page.locator('[data-seismic-compare-frame]')).toContainText(' g');
      await page.getByRole('combobox', { name: 'Comparison measure', exact: true }).selectOption('stored');
      await expect(page.locator('[data-seismic-compare-frame]')).toContainText('J/kg');
      await captureImmersiveRegion(page, timeline, 'bridge-' + width + '-comparison-energy.png', COMPARISON_REPORT);
      await page.getByRole('textbox', { name: 'Earthquake trial name', exact: true }).fill('Added damping: 20%');
      await page.getByRole('button', { name: 'Save earthquake trial', exact: true }).click();
      await page.getByRole('combobox', { name: 'Earthquake reference trial', exact: true }).selectOption('1');
      await expect(page.getByRole('combobox', { name: 'Timeline reference trial', exact: true })).toHaveValue('1');
      const identical = await timeline.locator('[data-seismic-comparison-curves] polyline').evaluateAll(lines => lines.map(line => line.getAttribute('points')));
      expect(identical[0]).toBe(identical[1]);
      await page.getByRole('button', { name: 'Restore earthquake trial 1: Reference: 5% damping', exact: true }).click();
      const frequency = page.getByRole('slider', { name: 'Ground shaking frequency (Hz)', exact: true });
      await frequency.press('End');
      await expect(comparison).toContainText('The ground motion differs');
      await page.getByRole('button', { name: 'Use reference shaking', exact: true }).click();
      await expect(comparison).toContainText('Changed settings: Damping ratio (%)');
      await expect(comparison).toContainText('Both trials use the same ground motion');
      await captureImmersiveRegion(page, comparison, 'bridge-' + width + '-comparison-table.png', COMPARISON_REPORT);
      if (width === 320) {
        const tableRegion = page.getByRole('region', { name: 'Saved earthquake trial comparison table', exact: true });
        await expect(tableRegion.locator('[data-seismic-cell-label]').first()).toBeVisible();
        expect(await tableRegion.evaluate(element => {
          const bounds = element.getBoundingClientRect();
          return [...element.querySelectorAll('[data-seismic-cell-value]')].every(value => {
            const box = value.getBoundingClientRect();
            return box.left >= bounds.left && box.right <= bounds.right;
          });
        })).toBe(true);
      }
      await checkWorkflowHealth(page);
      const expectedRows = await comparison.locator('tbody').textContent();
      await page.getByRole('button', { name: 'Open earthquake evidence report', exact: true }).click();
      const printed = page.locator('[data-bridge-print-seismic]');
      await expect(printed.locator('[data-seismic-trial-comparison]')).toContainText('Reference: Added damping: 20%');
      expect(await printed.locator('[data-seismic-trial-comparison] tbody').textContent()).toBe(expectedRows);
      await expect(printed.locator('button,input,select,textarea')).toHaveCount(0);
      await captureImmersiveRegion(page, printed, 'bridge-' + width + '-comparison-report.png', COMPARISON_REPORT);
      await checkWorkflowHealth(page);
    });
  }

  test.describe('earthquake frequency investigation', () => {
    test.use({ hasTouch: true });
    for (const width of [1000, 320]) {
      test('scan, select, inspect and compare damping at ' + width + 'px', async ({ page }) => {
        await mkdir(FREQUENCY_REPORT, { recursive: true });
        await mountWorkflow(page, width, { bridgeView: 'immersive', seismicEnabled: true,
          seismicTime: 6, seismicFrequencyHz: 2, seismicDampingRatio: 0.05 });
        const stage = page.locator('[data-allo-fs-stage]');
        const before = await page.evaluate(() => (window as any).__gl());
        const scan = page.locator('[data-bridge-seismic-scan]');
        await scan.locator('summary').click();
        await expect(scan.locator('[data-seismic-scan-status]')).toHaveAttribute('data-seismic-scan-status', 'idle');
        await page.getByRole('button', { name: 'Run frequency scan', exact: true }).click();
        await expect(scan.locator('[data-seismic-scan-status]')).toHaveAttribute('data-seismic-scan-status', 'complete', { timeout: 60000 });
        const points = (await scan.locator('[data-seismic-scan-curve]').getAttribute('points'))!.split(' ');
        expect(points.length).toBe(57);
        expect(points.join(' ')).not.toMatch(/NaN|Infinity/);
        expect(await page.evaluate(() => (window as any).__bucket().seismicTime)).toBe(6);
        const slider = page.getByRole('slider', { name: 'Select scanned frequency (Hz)', exact: true });
        await slider.scrollIntoViewIfNeeded();
        const box = await slider.boundingBox();
        if (!box) throw new Error('Frequency curve is not visible');
        if (width === 320) await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
        else {
          await page.mouse.move(box.x + box.width / 4, box.y + box.height / 2);
          await page.mouse.down();
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 4 });
          await page.mouse.up();
        }
        await expect(slider).toHaveAttribute('aria-valuenow', '1.6');
        await expect(slider).toBeFocused();
        await slider.press('Home');
        await expect(page.getByRole('button', { name: 'Previous frequency', exact: true })).toBeDisabled();
        await slider.press('PageUp');
        await expect(slider).toHaveAttribute('aria-valuenow', '0.45');
        await slider.press('End');
        await expect(page.getByRole('button', { name: 'Next frequency', exact: true })).toBeDisabled();
        await page.getByRole('button', { name: 'Select largest response', exact: true }).click();
        const selected = Number(await slider.getAttribute('aria-valuenow'));
        expect(selected).toBeGreaterThanOrEqual(1);
        expect(selected).toBeLessThanOrEqual(1.2);
        expect(await page.evaluate(() => (window as any).__bucket().seismicFrequencyHz)).toBe(2);
        const baselinePeak = await scan.locator('[data-seismic-scan-selected]').evaluate(element => parseFloat(element.children[1].textContent!.split(': ')[1]));
        await captureImmersiveRegion(page, scan, 'bridge-' + width + '-frequency-motion.png', FREQUENCY_REPORT);
        await page.getByRole('button', { name: 'Inspect this frequency', exact: true }).click();
        await expect(page.locator('[aria-describedby="bridge-gl-description"]')).toBeFocused();
        await expect.poll(() => page.evaluate(() => (window as any).__bucket().seismicFrequencyHz)).toBe(selected);
        expect(await page.evaluate(() => (window as any).__bucket().seismicPlaying)).toBe(false);
        await stage.scrollIntoViewIfNeeded();
        await expect.poll(() => page.evaluate(() => (window as any).__gl().relativeOffsetM)).not.toBe(before.relativeOffsetM);
        expect(await page.evaluate(() => (window as any).__gl().sceneBuilds)).toBe(before.sceneBuilds);
        await captureImmersiveRegion(page, stage, 'bridge-' + width + '-frequency-inspection.png', FREQUENCY_REPORT);
        await page.getByRole('textbox', { name: 'Earthquake trial name', exact: true }).fill('Largest scanned motion: 5% damping');
        await page.getByRole('button', { name: 'Save earthquake trial', exact: true }).click();
        expect(await page.evaluate(() => (window as any).__bucket().seismicTrials[0].inputs.groundFrequencyHz)).toBe(selected);
        await page.locator('[data-bridge-seismic] summary').click();
        await page.getByRole('button', { name: 'Try 20% damping', exact: true }).click();
        await expect(scan.locator('[data-seismic-scan-status]')).toHaveAttribute('data-seismic-scan-status', 'stale');
        await expect(scan.locator('[data-seismic-scan-results]')).toHaveCount(0);
        await page.getByRole('button', { name: 'Run frequency scan', exact: true }).click();
        await expect(scan.locator('[data-seismic-scan-status]')).toHaveAttribute('data-seismic-scan-status', 'complete', { timeout: 60000 });
        await page.getByRole('button', { name: 'Select largest response', exact: true }).click();
        const dampedPeak = await scan.locator('[data-seismic-scan-selected]').evaluate(element => parseFloat(element.children[1].textContent!.split(': ')[1]));
        expect(dampedPeak).toBeLessThan(baselinePeak);
        await page.getByRole('combobox', { name: 'Frequency scan measure', exact: true }).selectOption('acceleration');
        await expect(slider).toHaveAttribute('aria-valuetext', / g$/);
        await page.getByRole('button', { name: 'Select largest response', exact: true }).click();
        await captureImmersiveRegion(page, scan, 'bridge-' + width + '-frequency-acceleration.png', FREQUENCY_REPORT);
        await page.getByRole('button', { name: 'Inspect this frequency', exact: true }).click();
        expect(await page.evaluate(() => (window as any).__bucket().seismicPlaying)).toBe(false);
        await checkWorkflowHealth(page);
      });
    }
    test('zero-input scan remains usable in reduced-motion 2D mode', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await mountWorkflow(page, 320, { seismicEnabled: true, seismicIntensityG: 0 });
      await page.getByRole('button', { name: 'Labelled 2D view', exact: true }).click();
      const scan = page.locator('[data-bridge-seismic-scan]');
      await scan.locator('summary').click();
      await page.getByRole('button', { name: 'Run frequency scan', exact: true }).click();
      await expect(scan.locator('[data-seismic-scan-status]')).toHaveAttribute('data-seismic-scan-status', 'complete', { timeout: 60000 });
      await expect(scan).toContainText('All responses are zero');
      await expect(page.getByRole('button', { name: 'Select largest response', exact: true })).toBeDisabled();
      await page.getByRole('button', { name: 'Next frequency', exact: true }).click();
      await page.getByRole('button', { name: 'Inspect this frequency', exact: true }).click();
      await expect(page.locator('[data-bridge-elevation]')).toBeFocused();
      expect(await page.evaluate(() => (window as any).__bucket().seismicTime)).toBe(0);
      expect(await page.evaluate(() => (window as any).__bucket().seismicPlaying)).toBe(false);
      await checkWorkflowHealth(page);
    });
  });

  for (const width of [1000, 320]) {
    test('bridge viewpoints: deliberate camera presets and energy inside the scene at ' + width + 'px', async ({ page }) => {
      await mountWorkflow(page, width, { bridgeView: 'immersive', seismicEnabled: true, seismicTime: 7.2,
        seismicObservation: 'Watch energy transfer after the shaking ends.' });
      const stage = page.locator('[data-allo-fs-stage]');
      const viewer = page.locator('[aria-describedby="bridge-gl-description"]');
      const readout = page.getByRole('group', { name: 'Earthquake scene readout', exact: true });
      const summary = page.locator('[data-bridge-scene-energy] summary');
      const frame = page.locator('[data-bridge-scene-energy-frame]');
      const before = await page.evaluate(() => (window as any).__gl());
      await expect(frame).toHaveCount(0);
      await expect(readout).toHaveAttribute('aria-live', 'off');
      await expect(page.getByRole('button', { name: 'Along the deck', exact: true })).toHaveAttribute('aria-pressed', 'true');
      await captureImmersiveRegion(page, page.getByRole('group', { name: 'Bridge viewpoints', exact: true }), `bridge-${width}-viewpoints.png`);

      await page.getByRole('button', { name: 'River overlook', exact: true }).click();
      await expect(viewer).toBeFocused();
      await expect.poll(() => page.evaluate(() => (window as any).__gl().cameraDirection[2])).toBeGreaterThan(0.9);
      await expect(page.getByRole('button', { name: 'River overlook', exact: true })).toHaveAttribute('aria-pressed', 'true');
      const riverDirection = await page.evaluate(() => (window as any).__gl().cameraDirection);
      await summary.press('Enter');
      await expect(frame).toHaveAttribute('data-bridge-scene-energy-frame', '7.2');
      await expect(page.locator('[data-bridge-scene-phase]')).toHaveText('Shaking phase');
      expect(await page.evaluate(() => (window as any).__gl().cameraDirection)).toEqual(riverDirection);
      const limit = Number(await frame.getAttribute('data-energy-limit'));
      const segments = await frame.locator('[data-scene-energy-part]').evaluateAll(elements => elements.map(element => ({
        value: Number(element.getAttribute('data-energy-value')), width: parseFloat((element as HTMLElement).style.width)
      })));
      expect(segments).toHaveLength(3);
      for (const segment of segments) expect(segment.width).toBeCloseTo(segment.value / limit * 100, 4);
      await captureImmersiveRegion(page, stage, `bridge-${width}-river-energy.png`);

      await page.getByRole('button', { name: 'Look back toward entrance', exact: true }).click();
      await expect(viewer).toBeFocused();
      await expect.poll(() => page.evaluate(() => (window as any).__gl().cameraDirection[0])).toBeLessThan(-0.99);
      expect(await page.evaluate(() => (window as any).__bucket().seismicTime)).toBe(7.2);
      await captureImmersiveRegion(page, stage, `bridge-${width}-entrance-energy.png`);
      await page.getByRole('button', { name: 'Along the deck', exact: true }).click();
      await expect.poll(() => page.evaluate(() => (window as any).__gl().cameraDirection[0])).toBeGreaterThan(0.99);
      await page.getByRole('button', { name: 'Inspect end of shaking', exact: true }).click();
      await expect(frame).toHaveAttribute('data-bridge-scene-energy-frame', '16');
      await expect(page.locator('[data-bridge-scene-phase]')).toHaveText('Free vibration');
      expect(Number(await frame.getAttribute('data-energy-limit'))).toBe(limit);

      async function checkSceneBounds() {
        await stage.scrollIntoViewIfNeeded();
        expect(await readout.evaluate(element => {
          const box = element.getBoundingClientRect();
          const replay = document.querySelector('[data-bridge-scene-replay]')!.getBoundingClientRect();
          const summary = element.querySelector('summary')!;
          return { gap: replay.top - box.bottom, overflow: element.scrollWidth - element.clientWidth,
            summaryOverflow: summary.scrollWidth - summary.clientWidth };
        })).toMatchObject({ overflow: 0, summaryOverflow: 0 });
        const gap = await readout.evaluate(element => document.querySelector('[data-bridge-scene-replay]')!.getBoundingClientRect().top - element.getBoundingClientRect().bottom);
        expect(gap, 'readout leaves the replay controls uncovered').toBeGreaterThanOrEqual(4);
      }
      await checkSceneBounds();
      await captureImmersiveRegion(page, stage, `bridge-${width}-walkway-energy.png`);
      if (width === 320) await stage.evaluate(element => {
        Object.defineProperty(element, 'requestFullscreen', { configurable: true,
          value: () => Promise.reject(new Error('Exercise fill-frame canvas sizing')) });
      });
      await page.getByRole('button', { name: 'View the 3D bridge fullscreen', exact: true }).click();
      const exit = page.getByRole('button', { name: 'Exit fullscreen 3D bridge (Escape)', exact: true });
      await expect(exit).toBeVisible();
      await checkBridgeCanvasFillsStage(page);
      await checkSceneBounds();
      await expect(summary).toBeVisible();
      await stage.screenshot({ path: join(ENHANCEMENT_REPORT, `bridge-${width}-fullscreen-energy.png`) });
      await summary.press('Enter');
      await expect(frame).toHaveCount(0);
      await summary.press('Enter');
      await expect(frame).toHaveCount(1);
      await page.getByRole('slider', { name: 'Scene replay time (s)', exact: true }).press('End');
      await expect(frame).toHaveAttribute('data-bridge-scene-energy-frame', '24');
      expect(Number(await frame.getAttribute('data-energy-limit'))).toBe(limit);
      await exit.click();
      await checkBridgeCanvasFillsStage(page);

      await page.getByRole('button', { name: '3D structure', exact: true }).click();
      await checkSceneBounds();
      await captureImmersiveRegion(page, stage, `bridge-${width}-orbit-energy.png`);
      await page.getByRole('button', { name: 'On the bridge', exact: true }).click();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.getByRole('button', { name: 'River overlook', exact: true }).click();
      await expect(viewer).toBeFocused();
      await expect(page.getByRole('button', { name: 'Replay scene', exact: true })).toBeDisabled();
      expect(await page.evaluate(() => (window as any).__bucket().seismicTime)).toBe(24);
      expect(await page.evaluate(() => (window as any).__bucket().seismicObservation)).toBe('Watch energy transfer after the shaking ends.');
      await expect.poll(() => page.evaluate(() => (window as any).__gl().sceneBuilds)).toBe(before.sceneBuilds);
      await checkWorkflowHealth(page);
    });
  }

  for (const width of [1000, 320]) {
    test('guided damping: predict, compare scenes, preserve evidence and print at ' + width + 'px', async ({ page }) => {
      await mountWorkflow(page, width, { bridgeView: 'immersive', seismicEnabled: true, seismicTime: 7.2,
        seismicPrediction: 'Keep my notebook prediction.', seismicObservation: 'Keep my notebook evidence.' });
      await page.locator('[data-bridge-guide-disclosure] summary').press('Enter');
      const guide = page.locator('[data-bridge-damping-guide="interactive"]');
      await page.getByLabel('Damping investigation prediction', { exact: true }).fill('At 20% damping, less motion and stored energy will remain after shaking stops.');
      await page.getByRole('button', { name: 'Prepare 5% / 20% comparison', exact: true }).click();
      await expect(guide.locator('[data-guide-feedback]')).toContainText('Damping is the only input');
      expect(await page.evaluate(() => (window as any).__bucket().seismicPlaying)).toBe(false);
      const chart = page.getByRole('slider', { name: 'Inspect earthquake timeline (s)', exact: true });
      await chart.press('Home');
      for (let i = 0; i < 8; i++) await chart.press('PageUp');
      await page.getByRole('button', { name: 'Compare damping scenes', exact: true }).click();
      await expect(page.locator('[aria-describedby="bridge-gl-description"]')).toBeFocused();
      const stage = page.locator('[data-allo-fs-stage]');
      const before = await page.evaluate(() => (window as any).__gl());
      await page.getByRole('button', { name: 'View the 3D bridge fullscreen', exact: true }).click();
      await checkBridgeCanvasFillsStage(page);
      await page.locator('[data-bridge-scene-energy] summary').press('Enter');
      const scale = await page.locator('[data-bridge-scene-energy-frame]').getAttribute('data-energy-limit');
      await stage.screenshot({ path: join(ENHANCEMENT_REPORT, `bridge-${width}-damping-b.png`) });
      await page.getByRole('button', { name: 'A · reference', exact: true }).click();
      await expect(page.locator('[data-bridge-scene-readout]')).toHaveAttribute('data-scene-trial', 'reference');
      await expect.poll(() => page.evaluate(() => (window as any).__gl().relativeOffsetM)).not.toBe(before.relativeOffsetM);
      expect(await page.evaluate(() => (window as any).__bucket().seismicTime)).toBe(8);
      await expect(page.locator('[data-bridge-scene-energy-frame]')).toHaveAttribute('data-energy-limit', scale!);
      expect(await page.evaluate(() => (window as any).__gl().cameraDirection)).toEqual(before.cameraDirection);
      expect(await page.evaluate(() => (window as any).__gl().sceneBuilds)).toBe(before.sceneBuilds);
      await stage.screenshot({ path: join(ENHANCEMENT_REPORT, `bridge-${width}-damping-a.png`) });
      await page.getByRole('button', { name: 'B · current', exact: true }).click();
      await expect.poll(() => page.evaluate(() => (window as any).__gl().relativeOffsetM)).toBeCloseTo(before.relativeOffsetM, 9);
      const separation = await page.locator('[data-bridge-scene-readout]').evaluate(element =>
        document.querySelector('[data-bridge-scene-replay]')!.getBoundingClientRect().top - element.getBoundingClientRect().bottom);
      expect(separation).toBeGreaterThan(4);
      await page.getByRole('button', { name: 'A · reference', exact: true }).click();
      await page.getByRole('button', { name: 'Replay scene', exact: true }).click();
      await expect.poll(() => page.evaluate(() => (window as any).__bucket().seismicTime)).toBeGreaterThan(8);
      await page.getByRole('button', { name: 'Pause scene replay', exact: true }).click();
      const sharedTime = await page.evaluate(() => (window as any).__bucket().seismicTime);
      expect(Number(await page.locator('[data-bridge-scene-energy-frame]').getAttribute('data-bridge-scene-energy-frame'))).toBeCloseTo(sharedTime, 8);
      expect(Number(await guide.locator('[data-guide-readings="current"]').getAttribute('data-guide-time'))).toBeCloseTo(sharedTime, 8);
      await expect(page.locator('[data-bridge-scene-readout]')).toHaveAttribute('data-scene-trial', 'reference');
      await page.getByRole('button', { name: 'Exit fullscreen 3D bridge (Escape)', exact: true }).click();
      await page.getByRole('button', { name: 'Inspect both at 16 s', exact: true }).click();
      await page.getByRole('button', { name: 'Record paired evidence', exact: true }).click();
      await expect(guide.locator('[data-guide-evidence]')).toHaveAttribute('data-guide-evidence', 'matching');
      await expect(guide.locator('[data-guide-readings="recorded"]')).toHaveAttribute('data-guide-time', '16');
      const smallStored = guide.locator('[data-guide-readings="recorded"] [data-guide-value="b"]').last();
      const smallStoredValue = Number(await smallStored.getAttribute('data-guide-number'));
      expect(smallStoredValue).toBeGreaterThan(0);
      expect(smallStoredValue).toBeLessThan(0.001);
      await expect(smallStored).toContainText(/e-\d+ J\/kg/);
      const guideEnergyScale = Number(await guide.locator('[data-guide-readings="recorded"] [data-guide-energy-budget]').getAttribute('data-guide-energy-range'));
      expect(guideEnergyScale).toBeGreaterThanOrEqual(smallStoredValue);
      expect(Number(await guide.locator('[data-guide-readings="recorded"] [data-guide-energy-trial="b"] [data-guide-energy-bar="remaining"]').getAttribute('width')))
        .toBeCloseTo(smallStoredValue / guideEnergyScale * 400, 8);
      await page.getByLabel('Claim from the damping comparison', { exact: true }).fill('B has less relative motion in this experiment.');
      await page.getByLabel('Evidence and energy explanation', { exact: true }).fill('I compared the peak motion and the energy still stored at 16 seconds. Damping removes mechanical energy.');
      const recorded = await guide.locator('[data-guide-readings="recorded"]').textContent();
      await captureImmersiveRegion(page, guide.locator('[data-guide-readings="recorded"]'), `bridge-${width}-paired-evidence.png`);
      await page.locator('[data-bridge-seismic] summary').click();
      await page.getByRole('slider', { name: 'Ground shaking frequency (Hz)', exact: true }).press('End');
      await expect(guide.locator('[data-guide-feedback]')).toContainText('Response mode or ground motion differs');
      await expect(guide.locator('[data-guide-evidence]')).toHaveAttribute('data-guide-evidence', 'earlier');
      expect(await guide.locator('[data-guide-readings="recorded"]').textContent()).toBe(recorded);
      expect(await page.evaluate(() => (window as any).__bucket().seismicPrediction)).toBe('Keep my notebook prediction.');
      expect(await page.evaluate(() => (window as any).__bucket().seismicObservation)).toBe('Keep my notebook evidence.');
      await page.getByRole('button', { name: 'Open investigation report', exact: true }).click();
      const report = page.locator('[data-bridge-damping-guide="print"]');
      expect(await report.locator('[data-guide-readings="recorded"]').textContent()).toBe(recorded);
      await expect(report).toContainText('Damping removes mechanical energy.');
      await expect(report.locator('button,input,textarea')).toHaveCount(0);
      await captureImmersiveRegion(page, report, `bridge-${width}-guided-report.png`);
      await checkWorkflowHealth(page);
    });

    test('guided damping: qualitative case-study steps and reduced motion at ' + width + 'px', async ({ page }) => {
      await mountWorkflow(page, width);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      for (const selectedCase of ['tacoma', 'millennium']) {
        await page.evaluate(selected => (window as any).__set({ tab: 'cases', selectedCase: selected }), selectedCase);
        const illustration = page.locator('[data-bridge-dynamics]');
        await expect(illustration).toContainText('do not predict wind speed, crowd limits');
        const steps = illustration.getByRole('group', { name: 'Illustration steps', exact: true }).getByRole('button');
        await steps.nth(2).press('Enter');
        await expect(illustration.locator('[data-dynamics-step]')).toHaveAttribute('data-dynamics-step', '2');
        await expect(steps.nth(2)).toHaveAttribute('aria-pressed', 'true');
        await expect(illustration.locator('input[type="range"]')).toHaveCount(0);
        await captureImmersiveRegion(page, illustration, `bridge-${width}-${selectedCase}-mechanism.png`);
        await checkWorkflowHealth(page);
      }
      await page.getByRole('button', { name: 'Investigate damping and energy', exact: true }).click();
      await expect(page.locator('[data-bridge-damping-guide="interactive"]')).toBeVisible();
      await page.getByRole('button', { name: 'Prepare 5% / 20% comparison', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Run earthquake', exact: true })).toBeDisabled();
      await page.getByRole('button', { name: 'Inspect both at 24 s', exact: true }).click();
      await expect(page.locator('[data-guide-readings="current"]')).toHaveAttribute('data-guide-time', '24');
      expect(await page.evaluate(() => (window as any).__bucket().seismicPlaying)).toBe(false);
      await checkWorkflowHealth(page);
    });
  }

  for (const width of [1000, 320]) {
    test('motion guide: fixed references, A/B scale, fullscreen and fallback at ' + width + 'px', async ({ page }) => {
      await mountWorkflow(page, width, { bridgeView: 'immersive', seismicEnabled: true, seismicTime: 7.2,
        seismicGuideOpen: true, crossSectionMm2: 30000, lateralBraceEvery: 1 });
      // Graphics recovery preserves 2D; choose the intended scene for this fixture.
      await page.getByRole('button', { name: 'On the bridge', exact: true }).click();
      const stage = page.locator('[data-allo-fs-stage]');
      const guide = page.locator('[data-bridge-motion-guide="scene"]');
      const summary = guide.locator('summary');
      const frame = page.locator('[data-motion-frame]');
      await expect(frame).toHaveCount(0);
      await expect(guide.locator('[data-motion-position-diagram]')).toHaveCount(0);
      await summary.press('Enter');
      await expect(frame).toHaveAttribute('data-motion-frame', '7.2');
      await expect.poll(() => page.evaluate(() => (window as any).__gl().motionReferenceVisible)).toBe(true);
      const before = await page.evaluate(() => (window as any).__gl());
      expect(before.motionReferencePosition).toEqual([0, 0, 0]);
      async function checkReadings() {
        await stage.scrollIntoViewIfNeeded();
        const values = await frame.locator('[data-motion-reading]').evaluateAll(nodes =>
          Object.fromEntries(nodes.map(node => [node.getAttribute('data-motion-reading'), Number(node.getAttribute('data-motion-value-m'))])));
        await expect.poll(() => page.evaluate(() => (window as any).__gl().deckOffsetM)).toBeCloseTo(values.deck, 9);
        await expect.poll(() => page.evaluate(() => (window as any).__gl().groundOffsetM)).toBeCloseTo(values.ground, 9);
        expect(values.deck - values.ground).toBeCloseTo(values.relative, 9);
        await checkMotionPositionDiagram(frame);
        expect(await frame.evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
      }
      await checkReadings();
      await captureImmersiveRegion(page, frame.locator('[data-motion-position-diagram]'), 'bridge-' + width + '-position-diagram.png', ENHANCEMENT_REPORT);
      // Inspect a real opposing-motion frame: the gap must span both offsets.
      let opposing: Awaited<ReturnType<typeof checkMotionPositionDiagram>> | null = null;
      for (const time of [7.2, 7, 7.5, 8, 8.5, 9, 9.5, 10]) {
        await page.evaluate(time => (window as any).__set({ seismicTime: time }), time);
        await expect(frame).toHaveAttribute('data-motion-frame', String(time));
        const candidate = await checkMotionPositionDiagram(frame);
        if (candidate.readings.deck * candidate.readings.ground < 0) { opposing = candidate; break; }
      }
      expect(opposing, 'the paused event includes opposing deck and ground motion').not.toBeNull();
      expect(opposing!.gapWidth).toBeGreaterThan(Math.max(Math.abs(opposing!.x.deck - 200), Math.abs(opposing!.x.ground - 200)));
      await page.evaluate(() => (window as any).__set({ seismicTime: 7.2 }));
      await checkReadings();
      const lastReading = frame.locator('[data-motion-reading="relative"]');
      // The expanded guide uses the scene panel's native vertical scroll.
      // Bring its numerical readings into view before checking their bounds.
      await lastReading.evaluate(element => {
        element.scrollIntoView({ block: 'end', inline: 'nearest' });
        const panel = element.closest('[data-bridge-scene-readout]') as HTMLElement;
        panel.scrollTop += 8;
      });
      const readingBounds = await frame.locator('[data-motion-reading]').evaluateAll(nodes => nodes.map(node => {
        const box = node.getBoundingClientRect(), panel = node.closest('[data-bridge-scene-readout]')!.getBoundingClientRect();
        return { top: box.top, bottom: box.bottom, panelTop: panel.top, panelBottom: panel.bottom };
      }));
      expect(readingBounds).toHaveLength(3);
      for (const box of readingBounds) {
        expect(box.top, 'each numerical reading clears the upper panel edge').toBeGreaterThanOrEqual(box.panelTop + 2);
        expect(box.bottom, 'each numerical reading remains within the scrollable panel').toBeLessThanOrEqual(box.panelBottom - 2);
      }
      expect(await lastReading.evaluate(element => element.getBoundingClientRect().bottom
        - element.closest('[data-bridge-scene-readout]')!.getBoundingClientRect().bottom),
        'all three measurements fit the compact scene panel').toBeLessThanOrEqual(-2);
      await captureImmersiveRegion(page, stage, 'bridge-' + width + '-motion-guide.png');
      await page.getByRole('button', { name: 'Prepare 5% / 20% comparison', exact: true }).click();
      await page.getByRole('button', { name: 'Inspect both at 16 s', exact: true }).click();
      await page.getByRole('button', { name: 'View the 3D bridge fullscreen', exact: true }).click();
      await checkBridgeCanvasFillsStage(page);
      await page.evaluate(() => (window as any).__set({ seismicTime: 8 }));
      // The outline, two trails and shared marker first upload when comparison is visible.
      // Measure that initial allocation separately from repeated replay and toggles.
      await expect.poll(() => page.evaluate(() => (window as any).__gl().resources.geometries)).toBe(before.resources.geometries + 4);
      const comparisonResources = await page.evaluate(() => (window as any).__gl().resources);
      expect(comparisonResources.textures).toBe(before.resources.textures);
      const range = await frame.getAttribute('data-motion-range-m');
      await checkReadings();
      const b = await frame.locator('[data-motion-reading="deck"]').getAttribute('data-motion-value-m');
      await page.getByRole('button', { name: 'A · reference', exact: true }).click();
      await expect(frame).toHaveAttribute('data-motion-trial', 'reference');
      await expect(frame).toHaveAttribute('data-motion-range-m', range!);
      expect(await frame.locator('[data-motion-reading="deck"]').getAttribute('data-motion-value-m')).not.toBe(b);
      await checkReadings();
      await stage.screenshot({ path: join(ENHANCEMENT_REPORT, 'bridge-' + width + '-motion-a-fullscreen.png') });
      await page.getByRole('button', { name: 'B · current', exact: true }).click();
      await expect(frame).toHaveAttribute('data-motion-range-m', range!);
      await expect(frame.locator('[data-motion-reading="deck"]')).toHaveAttribute('data-motion-value-m', b!);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.getByRole('slider', { name: 'Scene replay time (s)', exact: true }).press('End');
      await expect(frame).toHaveAttribute('data-motion-frame', '24');
      await expect(frame).toHaveAttribute('data-motion-range-m', range!);
      await checkMotionPositionDiagram(frame);
      await expect(page.getByRole('button', { name: 'Replay scene', exact: true })).toBeDisabled();
      await summary.press('Enter');
      await expect(frame).toHaveCount(0);
      await expect(guide.locator('[data-motion-position-diagram]')).toHaveCount(0);
      await expect.poll(() => page.evaluate(() => (window as any).__gl().motionReferenceVisible)).toBe(false);
      await summary.press('Enter');
      await expect.poll(() => page.evaluate(() => (window as any).__gl().motionReferenceVisible)).toBe(true);
      expect(await page.evaluate(() => (window as any).__gl().sceneBuilds)).toBe(before.sceneBuilds);
      expect(await page.evaluate(() => (window as any).__gl().resources)).toEqual(comparisonResources);
      await page.getByRole('button', { name: 'Exit fullscreen 3D bridge (Escape)', exact: true }).click();
      await page.getByRole('button', { name: '3D structure', exact: true }).click();
      await page.evaluate(() => (window as any).__set({ seismicSceneCompare: false, seismicTime: 7.2 }));
      await stage.scrollIntoViewIfNeeded();
      await checkReadings();
      await captureImmersiveRegion(page, stage, 'bridge-' + width + '-motion-orbit.png');
      await page.evaluate(() => (window as any).__set({ bridgeView: '2d', seismicIntensityG: 0 }));
      await expect(page.locator('[data-bridge-motion-guide="fallback"]')).toBeVisible();
      await expect(frame).toHaveAttribute('data-motion-trial', 'current');
      await expect(frame.locator('[data-motion-reading]')).toHaveText(['Ground from rest0.00 cm', 'Deck from rest0.00 cm', 'Deck relative to ground0.00 cm']);
      await expect(frame).toContainText('Current experiment');
      await page.getByRole('button', { name: 'Step forward 0.5 s', exact: true }).click();
      await expect(frame).toHaveAttribute('data-motion-frame', '7.7');
      await checkMotionPositionDiagram(frame);
      await captureImmersiveRegion(page, frame.locator('[data-motion-position-diagram]'), 'bridge-' + width + '-position-fallback.png', ENHANCEMENT_REPORT);
      await captureImmersiveRegion(page, page.locator('[data-bridge-motion-guide="fallback"]'), 'bridge-' + width + '-motion-fallback.png');
      await page.getByLabel('Earthquake experiment', { exact: true }).uncheck();
      await expect(page.locator('[data-bridge-motion-guide]')).toHaveCount(0);
      await checkWorkflowHealth(page);
    });
  }

  for (const width of [1000, 320]) {
    test('key moments: selected trial peaks, compact controls and fullscreen at ' + width + 'px', async ({ page }) => {
      await mountWorkflow(page, width, { bridgeView: 'immersive', bridgeObserver: 'bank', seismicEnabled: true,
        seismicGuideOpen: true, seismicTime: 7, crossSectionMm2: 30000, lateralBraceEvery: 1,
        seismicObservation: 'Keep this comparison.' });
      const stage = page.locator('[data-allo-fs-stage]');
      const select = page.getByRole('combobox', { name: 'Scene key moments', exact: true });
      const readout = page.locator('[data-bridge-scene-readout]');
      const replay = page.locator('[data-bridge-scene-replay]');
      async function checkOverlayFit() {
        const panel = await replay.boundingBox(), measurements = await readout.boundingBox();
        if (!panel || !measurements) throw new Error('Scene controls missing');
        expect(measurements.y + measurements.height).toBeLessThanOrEqual(panel.y - 4);
        expect(await replay.evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
        const containers = await stage.boundingBox();
        if (!containers) throw new Error('Stage missing');
        expect(panel.x).toBeGreaterThan(containers.x);
        expect(panel.x + panel.width).toBeLessThan(containers.x + containers.width);
      }
      await page.getByRole('button', { name: 'Prepare 5% / 20% comparison', exact: true }).click();
      await stage.scrollIntoViewIfNeeded();
      const before = await page.evaluate(() => (window as any).__gl());
      const bTime = Number(await select.locator('option[value="motion"]').getAttribute('data-moment-time'));
      await page.getByRole('button', { name: 'A · reference', exact: true }).click();
      const aTime = Number(await select.locator('option[value="motion"]').getAttribute('data-moment-time'));
      expect(aTime).not.toBe(bTime);
      await select.selectOption('motion');
      expect(await page.evaluate(() => (window as any).__bucket().seismicTime)).toBe(aTime);
      expect(await page.evaluate(() => (window as any).__bucket().seismicPlaying)).toBe(false);
      await expect(page.locator('[data-bridge-moment-insight="motion"]')).toHaveAttribute('data-moment-trial', 'reference');
      await page.getByRole('button', { name: 'B · current', exact: true }).click();
      expect(await page.evaluate(() => (window as any).__bucket().seismicTime)).toBe(aTime);
      await expect(select).toHaveValue('');
      await page.getByRole('button', { name: 'Replay scene', exact: true }).click();
      await select.selectOption('motion');
      expect(await page.evaluate(() => (window as any).__bucket().seismicTime)).toBe(bTime);
      expect(await page.evaluate(() => (window as any).__bucket().seismicPlaying)).toBe(false);
      await checkOverlayFit();
      await captureImmersiveRegion(page, stage, 'bridge-' + width + '-key-moments-inline.png');
      await page.getByRole('button', { name: 'View the 3D bridge fullscreen', exact: true }).click();
      await checkBridgeCanvasFillsStage(page);
      await checkOverlayFit();
      await page.locator('[data-bridge-scene-energy] > summary').press('Enter');
      await stage.screenshot({ path: join(ENHANCEMENT_REPORT, 'bridge-' + width + '-key-moments-fullscreen.png') });
      await readout.locator(':scope > summary').press('Enter');
      await select.selectOption('free');
      await expect(readout).toContainText('16.000 s'); // inspected times are shown to the millisecond everywhere
      await expect(select).not.toHaveAttribute('aria-describedby');
      await readout.locator(':scope > summary').press('Enter');
      await expect(page.locator('[data-bridge-moment-insight="free"]')).toContainText('Ground motion has ended');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await select.focus();
      await select.press('End');
      await select.press('Tab');
      await expect(select).toHaveValue('end');
      await expect(page.locator('[data-bridge-moment-insight="end"]')).toContainText('does not mean the deck has settled');
      await expect(page.getByRole('button', { name: 'Replay scene', exact: true })).toBeDisabled();
      await checkOverlayFit();
      expect(await page.evaluate(() => (window as any).__gl().sceneBuilds)).toBe(before.sceneBuilds);
      expect(await page.evaluate(() => (window as any).__bucket().bridgeObserver)).toBe('bank');
      expect(await page.evaluate(() => (window as any).__bucket().seismicObservation)).toBe('Keep this comparison.');
      await page.getByRole('button', { name: 'Exit fullscreen 3D bridge (Escape)', exact: true }).click();
      await checkWorkflowHealth(page);
    });
  }

  for (const width of [1000, 320]) {
    test('moment readout: precise current motion, signed directions and coherent inspection times at ' + width + 'px', async ({ page }) => {
      test.setTimeout(360_000);
      const report = process.env.BRIDGE_CAPTURE_REPORT || ENHANCEMENT_REPORT;
      await mkdir(report, { recursive: true });
      const oracle = await loadFrameEnergyOracle(), checks: any[] = [], responses = new Map<string, any>();
      function responseFor(inputs: GuideInputs) {
        const key = JSON.stringify(inputs);
        if (!responses.has(key)) responses.set(key, oracle.bridgeSeismicResponse(inputs));
        return responses.get(key);
      }
      const normal = { archetype: 'balanced', groundFrequencyHz: 1.1, intensityG: 0.12, dampingRatio: 0.05 };
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await mountWorkflow(page, width, { bridgeView: '3d', seismicEnabled: true, seismicArchetype: normal.archetype,
        seismicFrequencyHz: normal.groundFrequencyHz, seismicIntensityG: normal.intensityG, seismicDampingRatio: normal.dampingRatio,
        seismicTime: 7.217, seismicIntervalPinS: 12.319, seismicEnergyInterval: false, seismicPlaying: false, autoDriving: false,
        seismicTrialName: 'Original inspected reference', seismicPrediction: 'Predict how ground and deck motion combine.',
        seismicObservation: 'Keep the signed displacement evidence.', seismicScenePrediction: 'Keep my scene prediction.',
        seismicSceneNote: 'Keep my scene note.' });
      await page.getByRole('button', { name: 'Labelled 2D view', exact: true }).click();
      await page.getByRole('button', { name: 'Save earthquake trial', exact: true }).click();
      async function bucket() { return page.evaluate(() => (window as any).__bucket()); }
      const saved = (await bucket()).seismicTrials;
      const frame = page.locator('[data-bridge-seismic-readout]');
      const timeline = page.locator('[data-bridge-seismic-timeline]'), chart = timeline.locator('[data-seismic-chart-slider]');
      async function check(inputs: GuideInputs, time: number, name: string) {
        const response = responseFor(inputs), point = oracle.bridgeSeismicSample(response, time);
        const phase = time >= 24 ? 'Observation ends' : time < 16 ? 'Shaking phase' : 'Free vibration';
        const timeText = time.toFixed(3) + ' s · ' + phase;
        const rows: [string, string, number, string][] = [
          ['ground', 'Ground from rest', point.groundM * 100, 'cm'],
          ['relative', 'Deck relative to ground', point.relativeM * 100, 'cm'],
          ['deck', 'Deck from rest', point.absoluteM * 100, 'cm'],
          ['acceleration', 'Absolute deck acceleration', point.absoluteAccelerationMps2 / 9.80665, 'g'],
          ['frequency-ratio', 'Shaking / natural frequency', response.frequencyRatio, 'ratio']
        ];
        await expect(frame).toHaveAttribute('data-current-moment', String(time));
        await expect(frame).toHaveAttribute('data-moment-trial', 'current');
        await expect(frame).toHaveAttribute('aria-live', 'off');
        await expect(frame).toHaveAttribute('aria-labelledby', 'bridge-seismic-moment-title');
        await expect(frame.getByRole('heading', { name: 'Motion at this moment', exact: true })).toBeVisible();
        // The caption names the response mode, so a reading can be told apart from a saved trial in another mode.
        const modeName = ({ flexible: 'Flexible response', balanced: 'Intermediate response', stiff: 'Stiffer response' } as Record<string, string>)[inputs.archetype];
        await expect(frame.locator('[data-moment-readout-caption]')).toHaveText('Current experiment · ' + modeName + ' · ' + timeText);
        await expect(frame.locator(':scope > dl')).toHaveCount(2);
        await expect(frame.locator('[data-moment-reading]')).toHaveCount(5);
        const actual: Record<string, number> = {};
        for (const [id, label, value, unit] of rows) {
          const row = frame.locator('dl > [data-moment-reading="' + id + '"]');
          await expect(row.locator(':scope > dt')).toHaveText(label);
          const reading = row.locator(':scope > dd');
          await expect(reading).toHaveCount(1); await expect(reading).toHaveAttribute('data-moment-unit', unit);
          actual[id] = Number(await reading.getAttribute('data-moment-value'));
          if (value === 0) expect(actual[id], id + ' is exactly zero').toBe(0);
          else expect(Math.abs(actual[id] - value), id + ' comes from the current response at the inspected time')
            .toBeLessThanOrEqual(Math.abs(value) * 2e-9);
          const display = unit === 'ratio' ? frameEnergyNumber(value) : (value > 0 ? '+' : '') + frameEnergyNumber(value) + ' ' + unit;
          await expect(reading).toHaveText(display);
          const geometry = await row.evaluate(node => {
            const reading = node.querySelector('dd')!, label = node.querySelector('dt')!, box = node.getBoundingClientRect();
            const value = reading.getBoundingClientRect(), text = label.getBoundingClientRect();
            return { native: !node.closest('svg,[aria-hidden="true"]'), font: parseFloat(getComputedStyle(reading).fontSize),
              nowrap: getComputedStyle(reading).whiteSpace, overflow: node.scrollWidth - node.clientWidth,
              inside: value.left >= box.left && value.right <= box.right + 1 && text.left >= box.left && text.right <= box.right + 1 };
          });
          expect(geometry).toMatchObject({ native: true, font: 14, nowrap: 'nowrap', inside: true });
          expect(geometry.overflow).toBeLessThanOrEqual(1);
        }
        const displacementScale = Math.max(Math.abs(actual.ground), Math.abs(actual.relative), Math.abs(actual.deck));
        expect(Math.abs(actual.deck - actual.ground - actual.relative), 'the unrounded displacement readings satisfy the addition relation')
          .toBeLessThanOrEqual(displacementScale * 2e-9);
        await expect(frame.locator('[data-moment-displacement-relation]')).toHaveText('Deck from rest = ground from rest + deck relative to ground. Readings are rounded.');
        await expect(frame.locator('[data-moment-acceleration-help]')).toContainText('Its sign alone does not tell you which way the deck is moving');
        await expect(frame.locator('[data-moment-readout-scope]')).toContainText('turning the camera does not change the signs');
        await expect(frame.locator('[data-moment-readout-scope]')).toContainText('before the scene’s 10× magnification');
        const scientific = rows.some(row => row[2] !== 0 && Math.abs(row[2]) < 0.001);
        await expect(frame.locator('[data-moment-readout-precision-help]')).toHaveCount(scientific ? 1 : 0);
        if (scientific) await expect(frame.locator('[data-moment-readout-precision-help]')).toContainText('A reading written with e is still nonzero');
        await expect(chart).toHaveAttribute('aria-valuenow', String(time));
        await expect(chart).toHaveAttribute('aria-valuetext', timeText);
        await expect(timeline.locator(':scope > p > strong')).toHaveText(timeText);
        await expect(page.locator('#bridge-seismic-time')).toHaveAttribute('aria-valuetext', time.toFixed(3) + ' s / 24 s');
        await expect(page.locator('label[for="bridge-seismic-time"]')).toContainText('Experiment time (s): ' + time.toFixed(3) + ' s / 24 s');
        expect(await frame.evaluate(node => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1);
        checks.push({ name, time, phase, inputs, rows: rows.map(([id, label, value, unit]) => ({ id, label, value, unit })), actual, scientific });
        return actual;
      }
      async function capture(name: string) {
        const viewport = page.viewportSize()!, before = await bucket();
        const initial = await frame.evaluate(node => ({ width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height }));
        try {
          await page.setViewportSize({ width: viewport.width, height: Math.max(viewport.height, Math.ceil(initial.height) + 1500) });
          let bounds: any, previous = '', stable = 0;
          try { await expect.poll(async () => {
            bounds = await frame.evaluate(async node => {
              const settle = () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
              await settle(); node.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }); await settle();
              const box = node.getBoundingClientRect(), clips = [];
              for (let parent = node.parentElement; parent; parent = parent.parentElement) {
                if (!/auto|scroll|hidden|clip/.test(getComputedStyle(parent).overflowY)) continue;
                const clip = parent.getBoundingClientRect();
                clips.push({ tag: parent.tagName, id: parent.id, top: clip.top, bottom: clip.bottom,
                  clientHeight: parent.clientHeight, scrollHeight: parent.scrollHeight, scrollTop: parent.scrollTop,
                  overflow: getComputedStyle(parent).overflowY });
              }
              return { width: box.width, top: box.top, bottom: box.bottom, viewport: innerHeight, clips };
            });
            const current = JSON.stringify(bounds); stable = current === previous ? stable + 1 : 1; previous = current;
            return stable >= 2 && Math.abs(bounds.width - initial.width) <= 1 && bounds.top >= 0 && bounds.bottom <= bounds.viewport
              && bounds.clips.every((clip: { top: number; bottom: number }) => bounds.top >= clip.top && bounds.bottom <= clip.bottom);
          }, { timeout: 15000, intervals: [100, 250, 500], message: 'Native moment readout is stable and completely visible at its original width' }).toBe(true);
          } finally { await writeFile(join(report, 'moment-readout-' + width + '-' + name + '-layout.json'), JSON.stringify({ initial, bounds, stable }, null, 2)); }
          expect(Math.abs(bounds.width - initial.width)).toBeLessThanOrEqual(1);
          expect(bounds.top).toBeGreaterThanOrEqual(0); expect(bounds.bottom).toBeLessThanOrEqual(bounds.viewport);
          for (const clip of bounds.clips) { expect(bounds.top).toBeGreaterThanOrEqual(clip.top); expect(bounds.bottom).toBeLessThanOrEqual(clip.bottom); }
          await frame.screenshot({ path: join(report, 'moment-readout-' + width + '-' + name + '.png') });
        } finally {
          await page.setViewportSize(viewport);
          await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
        }
        expect(await bucket(), 'native capture preserves notes, pin and saved evidence').toEqual(before);
      }
      await check(normal, 7.217, 'normal'); await capture('normal');
      const normalResponse = responseFor(normal);
      for (const sign of [1, -1]) {
        const point = normalResponse.samples.find((sample: any) => sample.timeS > 1 && sample.timeS < 16
          && sample.groundM * sign > 0.0001 && sample.relativeM * sign > 0.0001 && sample.absoluteM * sign > 0.0001);
        expect(point, 'the recorded model supplies a clear signed displacement example').toBeTruthy();
        await page.evaluate(time => (window as any).__set({ seismicTime: time }), point.timeS);
        const actual = await check(normal, point.timeS, sign > 0 ? 'positive-motion' : 'negative-motion');
        expect([actual.ground, actual.relative, actual.deck].every(value => value * sign > 0)).toBe(true);
      }
      for (const [kind, label] of [['energy', 'Energy over time'], ['motion', 'Motion over time'], ['comparison', 'Compare trials']] as const) {
        await page.evaluate(() => (window as any).__set({ seismicTime: 7.217 }));
        await timeline.getByRole('button', { name: label, exact: true }).click();
        await expect(timeline).toHaveAttribute('data-bridge-seismic-timeline', kind);
        const before = await bucket(); await chart.focus(); await chart.press('ArrowRight');
        await check(normal, 7.267, 'keyboard-' + kind);
        expect(await bucket()).toEqual({ ...before, seismicTime: 7.267, seismicPlaying: false, autoDriving: false });
      }
      await page.evaluate(() => (window as any).__set({ seismicTime: 16 }));
      await check(normal, 16, 'free-vibration'); await capture('free-vibration');
      await chart.press('End'); await check(normal, 24, 'observation-ends');
      await chart.press('Home');
      const initial = await check(normal, 0, 'initial-rest');
      expect([initial.ground, initial.relative, initial.deck, initial.acceleration]).toEqual([0, 0, 0, 0]);
      const zero = { ...normal, intensityG: 0 };
      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 0, seismicTime: 7.217 }));
      const empty = await check(zero, 7.217, 'zero-input');
      expect([empty.ground, empty.relative, empty.deck, empty.acceleration]).toEqual([0, 0, 0, 0]);
      const tiny = { ...normal, intensityG: 1e-9 };
      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 1e-9 }));
      await check(tiny, 7.217, 'tiny');
      for (const id of ['ground', 'relative', 'deck', 'acceleration'])
        await expect(frame.locator('[data-moment-reading="' + id + '"] dd')).toContainText(/e-\d+ (cm|g)$/);
      await capture('tiny');
      const current = { archetype: 'stiff', groundFrequencyHz: 1.1, intensityG: 0.24, dampingRatio: 0.2 };
      await page.evaluate(() => (window as any).__set({ seismicArchetype: 'stiff', seismicIntensityG: 0.24, seismicDampingRatio: 0.2,
        seismicTime: 7.217, seismicSceneCompare: true, seismicSceneSource: 'saved', seismicReferenceIndex: 0, seismicSceneTrial: 'reference' }));
      await page.getByRole('button', { name: 'From the riverbank', exact: true }).click();
      await page.getByRole('button', { name: 'A · reference', exact: true }).click();
      const a = await check(current, 7.217, 'scene-a-current-readings');
      expect(a['frequency-ratio']).not.toBe(normalResponse.frequencyRatio);
      const aScene = await bucket(), currentMarkup = await frame.innerHTML();
      await capture('scene-a-current');
      await page.getByRole('button', { name: 'B · current', exact: true }).click();
      expect(await check(current, 7.217, 'scene-b-current-readings')).toEqual(a);
      expect(await frame.innerHTML()).toBe(currentMarkup);
      await page.getByRole('button', { name: 'A · reference', exact: true }).click();
      expect(await check(current, 7.217, 'scene-a-again')).toEqual(a);
      await page.getByRole('button', { name: 'Labelled 2D view', exact: true }).click();
      expect(await check(current, 7.217, 'current-readings-in-2d')).toEqual(a);
      expect(await frame.innerHTML()).toBe(currentMarkup);
      expect(await bucket()).toMatchObject({ seismicIntervalPinS: 12.319, seismicPlaying: false, autoDriving: false,
        seismicSceneTrial: aScene.seismicSceneTrial, seismicPrediction: 'Predict how ground and deck motion combine.',
        seismicObservation: 'Keep the signed displacement evidence.', seismicScenePrediction: 'Keep my scene prediction.',
        seismicSceneNote: 'Keep my scene note.', seismicTrials: saved });
      await checkWorkflowHealth(page);
      await writeFile(join(report, 'moment-readout-' + width + '-checks.json'), JSON.stringify({ width, checks }, null, 2));
    });
  }

  for (const width of [1000, 320]) {
    test('mode comparison: precise shared-scale responses and native phone rows at ' + width + 'px', async ({ page }) => {
      test.setTimeout(360_000);
      const report = process.env.BRIDGE_CAPTURE_REPORT || ENHANCEMENT_REPORT;
      await mkdir(report, { recursive: true });
      const oracle = await loadFrameEnergyOracle(), checks: any[] = [];
      const modes = ['flexible', 'balanced', 'stiff'] as const;
      const names = { flexible: 'Flexible response', balanced: 'Intermediate response', stiff: 'Stiffer response' };
      type Mode = typeof modes[number];
      type Inputs = { groundFrequencyHz: number; intensityG: number; dampingRatio: number };
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await mountWorkflow(page, width, { bridgeView: '3d', seismicEnabled: true, seismicArchetype: 'balanced',
        seismicFrequencyHz: 1.1, seismicIntensityG: 0.12, seismicDampingRatio: 0.05, seismicTime: 7.217,
        seismicPlaying: false, autoDriving: false, seismicEnergyInterval: false, seismicIntervalPinS: 12.319,
        seismicTrialName: 'Original mode evidence', seismicPrediction: 'Predict which mode moves farther.',
        seismicObservation: 'Compare motion and acceleration separately.', seismicScenePrediction: 'Keep my scene prediction.',
        seismicSceneNote: 'Keep my scene note.' });
      await page.getByRole('button', { name: 'Labelled 2D view', exact: true }).click();
      await page.getByRole('button', { name: 'Save earthquake trial', exact: true }).click();
      const comparison = page.locator('[data-mode-comparison]');
      const table = comparison.locator('[data-bridge-seismic-comparison]');
      async function bucket() { return page.evaluate(() => (window as any).__bucket()); }
      const saved = (await bucket()).seismicTrials;
      function close(actual: number, wanted: number, label: string) {
        if (wanted === 0) expect(actual, label).toBe(0);
        else expect(Math.abs(actual - wanted), label).toBeLessThanOrEqual(Math.abs(wanted) * 2e-9);
      }
      async function values() {
        return table.locator('[data-mode-measure]').evaluateAll(nodes => nodes.map(node => ({
          mode: node.closest('[data-response-mode]')!.getAttribute('data-response-mode'), measure: node.getAttribute('data-mode-measure'),
          value: node.getAttribute('data-mode-value'), scale: node.getAttribute('data-mode-scale'),
          text: node.querySelector('[data-mode-reading]')!.textContent,
          bar: (node.querySelector('[data-mode-bar]') as HTMLElement | null)?.style.width ?? null
        })));
      }
      async function check(inputs: Inputs, selected: Mode, name: string) {
        // Every row comes independently from that mode's full response, with the
        // same shaking and damping. No comparison helper or DOM value is an oracle.
        const responses = modes.map(archetype => ({ archetype, response: oracle.bridgeSeismicResponse({ ...inputs, archetype }) }));
        const rows = responses.map(({ archetype, response }) => ({ archetype, frequency: response.naturalFrequencyHz,
          relative: response.peaks.relativeM * 100, acceleration: response.peaks.absoluteAccelerationMps2 / 9.80665 }));
        const scales = { relative: Math.max(...rows.map(row => row.relative)), acceleration: Math.max(...rows.map(row => row.acceleration)) };
        await expect(comparison).toHaveAttribute('aria-labelledby', 'bridge-mode-comparison-title');
        await expect(comparison.getByRole('heading', { name: 'Same shaking, different responses', exact: true })).toBeVisible();
        await expect(table).toHaveAttribute('role', 'table');
        await expect(table).toHaveAttribute('aria-describedby', 'bridge-mode-comparison-scale-help');
        await expect(table.locator('caption[data-mode-comparison-scope]')).toHaveText('Full-event peaks · 0–24 s');
        await expect(comparison.locator('[data-mode-comparison-scale-help]')).toContainText('Motion and acceleration use different scales');
        await expect(comparison.locator('[data-mode-comparison-scale-help]')).toContainText('their peaks can occur at different times');
        await expect(table.locator('thead[role="rowgroup"] tr[role="row"] th[role="columnheader"][scope="col"]')).toHaveCount(4);
        await expect(table.locator('tbody[role="rowgroup"] tr[role="row"]')).toHaveCount(3);
        await expect(table.locator('[data-mode-selection-label]')).toHaveCount(1);
        for (const expected of rows) {
          const row = table.locator('[data-response-mode="' + expected.archetype + '"]');
          const active = expected.archetype === selected;
          await expect(row).toHaveAttribute('data-mode-selected', String(active));
          const header = row.locator('th[role="rowheader"][scope="row"]');
          const button = header.getByRole('button', { name: names[expected.archetype], exact: true });
          await expect(button).toHaveAttribute('aria-pressed', String(active)); await expect(button).toBeEnabled();
          await expect(header.locator('[data-mode-selection-label]')).toHaveCount(active ? 1 : 0);
          if (active) {
            const badge = header.locator('[data-mode-selection-label]');
            await expect(badge).toHaveText('Selected'); await expect(badge).toBeVisible();
            expect(await badge.evaluate(node => ({ native: !node.closest('svg,[aria-hidden="true"],button'),
              font: parseFloat(getComputedStyle(node).fontSize), overflow: node.scrollWidth - node.clientWidth })))
              .toMatchObject({ native: true, font: 11, overflow: 0 });
          }
          for (const [measure, label, unit] of [
            ['frequency', 'Natural frequency', 'Hz'], ['relative', 'Peak relative motion', 'cm'], ['acceleration', 'Peak deck acceleration', 'g']
          ] as const) {
            const cell = row.locator('td[role="cell"][data-mode-measure="' + measure + '"]');
            const wanted = expected[measure], reading = cell.locator('[data-mode-reading]');
            close(Number(await cell.getAttribute('data-mode-value')), wanted, expected.archetype + ' ' + measure + ' uses the independent response');
            await expect(reading).toHaveText((measure === 'frequency' ? wanted.toFixed(2) : frameEnergyNumber(wanted)) + ' ' + unit);
            const labelNode = cell.locator('[data-mode-cell-label]');
            await expect(labelNode).toHaveText(label); await expect(labelNode).toHaveAttribute('aria-hidden', 'true');
            if (width <= 640) await expect(labelNode).toBeVisible(); else await expect(labelNode).toBeHidden();
            const geometry = await cell.evaluate(node => {
              const reading = node.querySelector('[data-mode-reading]')!, box = node.getBoundingClientRect(), text = reading.getBoundingClientRect();
              const bar = node.querySelector('[data-mode-bar]') as HTMLElement | null;
              const track = node.querySelector('[data-mode-bar-track]') as HTMLElement | null;
              const trackStyle = track && getComputedStyle(track);
              return { native: !reading.closest('svg,[aria-hidden="true"]'), nowrap: getComputedStyle(reading).whiteSpace,
                inside: text.left >= box.left && text.right <= box.right + 1, overflow: node.scrollWidth - node.clientWidth,
                widthPercent: bar ? parseFloat(bar.style.width) : null, barWidth: bar?.getBoundingClientRect().width ?? null,
                trackWidth: track ? track.getBoundingClientRect().width - parseFloat(trackStyle!.borderLeftWidth) - parseFloat(trackStyle!.borderRightWidth) : null,
                hiddenTrack: track?.getAttribute('aria-hidden') ?? null };
            });
            expect(geometry).toMatchObject({ native: true, nowrap: 'nowrap', inside: true });
            expect(geometry.overflow).toBeLessThanOrEqual(1);
            if (measure === 'frequency') {
              expect(await cell.getAttribute('data-mode-scale')).toBeNull(); await expect(cell.locator('[data-mode-bar]')).toHaveCount(0);
            } else {
              const scale = scales[measure], percent = scale > 0 ? wanted / scale * 100 : 0;
              close(Number(await cell.getAttribute('data-mode-scale')), scale, measure + ' uses the maximum across all three modes');
              await expect(cell.locator('[data-mode-bar]')).toHaveCount(1);
              expect(geometry.hiddenTrack).toBe('true');
              expect(Math.abs(geometry.widthPercent! - percent)).toBeLessThanOrEqual(0.0001);
              expect(Math.abs(geometry.barWidth! - geometry.trackWidth! * percent / 100)).toBeLessThanOrEqual(0.05);
              if (wanted === 0) expect(geometry.barWidth).toBe(0);
            }
          }
        }
        const positions = await table.locator('[data-response-mode]').evaluateAll(nodes => nodes.map(node => {
          const rect = node.getBoundingClientRect();
          const cells = [...node.children].map(cell => { const box = cell.getBoundingClientRect(); return { top: box.top, bottom: box.bottom, left: box.left, right: box.right }; });
          return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, cells };
        }));
        for (const row of positions) {
          for (let i = 0; i < row.cells.length; i++) {
            const cell = row.cells[i];
            expect(cell.left).toBeGreaterThanOrEqual(row.left - 1); expect(cell.right).toBeLessThanOrEqual(row.right + 1);
            if (i > 0 && width <= 640) expect(cell.top).toBeGreaterThanOrEqual(row.cells[i - 1].bottom - 1);
            if (i > 0 && width > 640) expect(cell.left).toBeGreaterThanOrEqual(row.cells[i - 1].right - 1);
          }
        }
        const zero = scales.relative === 0 && scales.acceleration === 0;
        const scientific = rows.some(row => [row.relative, row.acceleration].some(value => value !== 0 && Math.abs(value) < 0.001));
        await expect(comparison.locator('[data-mode-comparison-zero]')).toHaveCount(zero ? 1 : 0);
        if (zero) await expect(comparison.locator('[data-mode-comparison-zero]')).toContainText('The bars are empty');
        await expect(comparison.locator('[data-mode-comparison-precision-help]')).toHaveCount(scientific ? 1 : 0);
        if (scientific) await expect(comparison.locator('[data-mode-comparison-precision-help]')).toContainText('A reading written with e is still nonzero');
        for (const region of [comparison, table]) expect(await region.evaluate(node => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1);
        await checkWorkflowHealth(page);
        checks.push({ name, selected, inputs, rows, scales, zero, scientific, positions });
        return values();
      }
      async function capture(name: string) {
        const viewport = page.viewportSize()!, before = await bucket();
        const initial = await comparison.evaluate(node => ({ width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height }));
        try {
          await page.setViewportSize({ width: viewport.width, height: Math.max(viewport.height, Math.ceil(initial.height) + 1500) });
          let bounds: any, previous = '', stable = 0;
          try { await expect.poll(async () => {
            bounds = await comparison.evaluate(async node => {
              const settle = () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
              await settle(); node.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }); await settle();
              const box = node.getBoundingClientRect(), clips = [];
              for (let parent = node.parentElement; parent; parent = parent.parentElement) {
                if (!/auto|scroll|hidden|clip/.test(getComputedStyle(parent).overflowY)) continue;
                const clip = parent.getBoundingClientRect();
                clips.push({ tag: parent.tagName, id: parent.id, top: clip.top, bottom: clip.bottom,
                  clientHeight: parent.clientHeight, scrollHeight: parent.scrollHeight, scrollTop: parent.scrollTop,
                  overflow: getComputedStyle(parent).overflowY });
              }
              return { width: box.width, top: box.top, bottom: box.bottom, viewport: innerHeight, clips };
            });
            const current = JSON.stringify(bounds); stable = current === previous ? stable + 1 : 1; previous = current;
            return stable >= 2 && Math.abs(bounds.width - initial.width) <= 1 && bounds.top >= 0 && bounds.bottom <= bounds.viewport
              && bounds.clips.every((clip: { top: number; bottom: number }) => bounds.top >= clip.top && bounds.bottom <= clip.bottom);
          }, { timeout: 15000, intervals: [100, 250, 500], message: 'Native mode comparison is stable and fully visible at its original width' }).toBe(true);
          } finally { await writeFile(join(report, 'mode-comparison-' + width + '-' + name + '-layout.json'), JSON.stringify({ initial, bounds, stable }, null, 2)); }
          expect(Math.abs(bounds.width - initial.width)).toBeLessThanOrEqual(1);
          expect(bounds.top).toBeGreaterThanOrEqual(0); expect(bounds.bottom).toBeLessThanOrEqual(bounds.viewport);
          for (const clip of bounds.clips) { expect(bounds.top).toBeGreaterThanOrEqual(clip.top); expect(bounds.bottom).toBeLessThanOrEqual(clip.bottom); }
          await comparison.screenshot({ path: join(report, 'mode-comparison-' + width + '-' + name + '.png') });
        } finally {
          await page.setViewportSize(viewport);
          await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
        }
        expect(await bucket(), 'native capture preserves the experiment, notes and saved evidence').toEqual(before);
      }
      const normal = { groundFrequencyHz: 1.1, intensityG: 0.12, dampingRatio: 0.05 };
      const normalValues = await check(normal, 'balanced', 'normal'); await capture('normal');
      const inspectionBefore = await bucket();
      await page.evaluate(() => (window as any).__set({ seismicTime: 24 }));
      expect(await check(normal, 'balanced', 'different-inspection-time')).toEqual(normalValues);
      expect(await bucket()).toEqual({ ...inspectionBefore, seismicTime: 24 });
      for (const [mode, key] of [['stiff', 'Enter'], ['flexible', 'Space'], ['balanced', null]] as const) {
        const before = await bucket();
        const button = comparison.getByRole('button', { name: names[mode], exact: true });
        if (key) { await button.focus(); await button.press(key); } else await button.click();
        await expect(button).toBeFocused();
        expect(await bucket(), 'mode selection retains its established pause/reset behavior and all other evidence').toEqual({
          ...before, seismicArchetype: mode, seismicTime: 0, seismicPlaying: false, seismicSceneTrial: 'current'
        });
        expect(await check(normal, mode, 'select-' + mode)).toEqual(normalValues);
      }
      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 0, seismicTime: 7.217 }));
      await check({ ...normal, intensityG: 0 }, 'balanced', 'zero'); await capture('zero');
      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 1e-9 }));
      const tinyValues = await check({ ...normal, intensityG: 1e-9 }, 'balanced', 'tiny'); await capture('tiny');
      for (const value of tinyValues.filter(value => value.measure !== 'frequency')) {
        expect(value.text).toMatch(/e-\d+ (cm|g)$/);
        const original = normalValues.find(row => row.mode === value.mode && row.measure === value.measure)!;
        expect(Math.abs(parseFloat(value.bar!) - parseFloat(original.bar!)), 'relative bar proportions survive tiny nonzero input').toBeLessThanOrEqual(0.0001);
      }
      if (width === 1000) {
        const before = await bucket(), viewport = page.viewportSize()!;
        try {
          await page.setViewportSize({ width: 641, height: viewport.height });
          await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
          expect(await check({ ...normal, intensityG: 1e-9 }, 'balanced', 'tiny-at-641-breakpoint')).toEqual(tinyValues);
          for (const button of await comparison.getByRole('button').all()) {
            expect(await button.evaluate(node => {
              const bounds = node.getBoundingClientRect(), cell = node.closest('th,td')!.getBoundingClientRect(); // rows now also hold "Inspect recorded maximum" buttons in td cells
              return { height: bounds.height, inside: bounds.left >= cell.left && bounds.right <= cell.right,
                overflow: node.scrollWidth - node.clientWidth };
            })).toMatchObject({ inside: true, overflow: 0 });
          }
        } finally {
          await page.setViewportSize(viewport);
          await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
        }
        expect(await bucket(), 'checking the desktop breakpoint preserves experiment state').toEqual(before);
      }
      const alternate = { groundFrequencyHz: 2.3, intensityG: 0.24, dampingRatio: 0.2 };
      await page.evaluate(() => (window as any).__set({ seismicFrequencyHz: 2.3, seismicIntensityG: 0.24, seismicDampingRatio: 0.2, seismicTime: 12.319 }));
      const alternateValues = await check(alternate, 'balanced', 'alternate'); await capture('alternate');
      expect(alternateValues.filter(row => row.measure !== 'frequency')).not.toEqual(normalValues.filter(row => row.measure !== 'frequency'));
      await page.evaluate(() => (window as any).__set({ seismicTime: 0 }));
      expect(await check(alternate, 'balanced', 'alternate-at-start')).toEqual(alternateValues);
      expect(await bucket()).toMatchObject({ seismicIntervalPinS: 12.319, seismicPlaying: false, autoDriving: false,
        seismicPrediction: 'Predict which mode moves farther.', seismicObservation: 'Compare motion and acceleration separately.',
        seismicScenePrediction: 'Keep my scene prediction.', seismicSceneNote: 'Keep my scene note.', seismicTrials: saved });
      await writeFile(join(report, 'mode-comparison-' + width + '-checks.json'), JSON.stringify({ width, checks }, null, 2));
    });
  }
  for (const width of [1000, 320]) {
    test('saved readings: labeled evidence, tiny inputs and faithful notebook reports at ' + width + 'px', async ({ page }) => {
      test.setTimeout(360_000);
      const report = process.env.BRIDGE_CAPTURE_REPORT || ENHANCEMENT_REPORT;
      await mkdir(report, { recursive: true });
      const oracle = await loadFrameEnergyOracle(), checks: any[] = [];
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await mountWorkflow(page, width, { bridgeView: '3d', seismicEnabled: true, seismicArchetype: 'balanced',
        seismicFrequencyHz: 1.1, seismicIntensityG: 0.12, seismicDampingRatio: 0.05, seismicTime: 7.217,
        seismicPlaying: false, autoDriving: false, seismicEnergyInterval: false,
        seismicScenePrediction: 'Keep the separate scene prediction.', seismicSceneNote: 'Keep the separate scene note.' });
      await page.getByRole('button', { name: 'Labelled 2D view', exact: true }).click();
      const notebook = page.locator('[data-bridge-seismic-notebook]');
      const article = (index: number) => notebook.locator('[data-seismic-trial="' + index + '"]');
      async function bucket() { return page.evaluate(() => (window as any).__bucket()); }
      async function save(name: string, prediction: string, observation: string) {
        await page.getByRole('textbox', { name: 'Earthquake trial name', exact: true }).fill(name);
        await page.getByRole('textbox', { name: 'Earthquake prediction', exact: true }).fill(prediction);
        await page.getByRole('textbox', { name: 'Earthquake observation and explanation', exact: true }).fill(observation);
        await page.getByRole('button', { name: 'Save earthquake trial', exact: true }).click();
        return (await bucket()).seismicTrials.at(-1);
      }
      function inputText(input: any) {
        const mode = input.archetype === 'stiff' ? 'Stiffer response' : input.archetype === 'flexible' ? 'Flexible response' : 'Intermediate response';
        const damping = input.dampingRatio * 100;
        return mode + ' · ' + input.groundFrequencyHz.toFixed(2) + ' Hz · '
          + (input.intensityG > 0 && input.intensityG < 0.01 ? frameEnergyNumber(input.intensityG) : input.intensityG.toFixed(2)) + ' g · '
          + (damping > 0 && damping < 1 ? frameEnergyNumber(damping) : damping.toFixed(0)) + '% damping';
      }
      async function checkCard(card: import('@playwright/test').Locator, saved: any, name: string, printing = false) {
        const response = oracle.bridgeSeismicResponse(saved.inputs), point = oracle.bridgeSeismicSample(response, saved.timeS);
        const rows: [string, string, string, number, string][] = [
          ['event', 'peak-relative', 'Peak relative motion', response.peaks.relativeM * 100, 'cm'],
          ['event', 'peak-acceleration', 'Peak deck acceleration', response.peaks.absoluteAccelerationMps2 / 9.80665, 'g'],
          ['energy', 'kinetic', 'Kinetic', point.kineticJPerKg, 'J/kg'],
          ['energy', 'elastic', 'Elastic', point.strainJPerKg, 'J/kg'],
          ['energy', 'dissipated', 'Damping loss since 0 s', point.dissipatedJPerKg, 'J/kg'],
          ['energy', 'input', 'Net input work since 0 s', point.inputJPerKg, 'J/kg']
        ];
        if (saved.scene) rows.push(
          ['power', 'input-power', 'Ground input power', point.inputPowerWPerKg, 'W/kg'],
          ['power', 'damping-power', 'Damping loss rate', point.dampingPowerWPerKg, 'W/kg'],
          ['power', 'stored-power', 'Stored energy change rate', point.storedPowerWPerKg, 'W/kg']);
        await expect(card.locator(':scope > h4')).toHaveText(saved.name);
        await expect(card).toContainText('Inspected time: ' + saved.timeS.toFixed(3) + ' s');
        await expect(card.locator('[data-saved-input-summary]').first()).toHaveText(inputText(saved.inputs));
        await expect(card.locator('[data-saved-reading-group="event"] > h5')).toHaveText('Whole event · 0–24 s');
        await expect(card.locator('[data-saved-reading-group="energy"] > h5')).toHaveText('Energy at the inspected time');
        await expect(card.locator('[data-seismic-saved-energy]')).toHaveAttribute('data-saved-reading-group', 'energy');
        await expect(card.locator('[data-seismic-scene-power]')).toHaveCount(saved.scene ? 1 : 0);
        if (saved.scene) {
          await expect(card.locator('[data-seismic-scene-power]')).toHaveAttribute('data-saved-reading-group', 'power');
          await expect(card.locator('[data-seismic-scene-power] > h5')).toHaveText('Power at the inspected time');
        }
        await expect(card.locator('[data-saved-reading]')).toHaveCount(rows.length);
        for (const [group, id, label, value, unit] of rows) {
          const row = card.locator('[data-saved-reading-group="' + group + '"] > dl > [data-saved-reading="' + id + '"]');
          await expect(row.locator(':scope > dt')).toHaveText(label);
          await expect(row.locator(':scope > dd')).toHaveCount(1);
          const reading = row.locator(':scope > dd');
          await expect(reading).toHaveAttribute('data-saved-reading-unit', unit);
          const actual = Number(await reading.getAttribute('data-saved-reading-value'));
          if (value === 0) expect(actual, id + ' is exactly zero').toBe(0);
          else expect(Math.abs(actual - value), id + ' matches the saved trial response at its saved time')
            .toBeLessThanOrEqual(Math.abs(value) * 2e-9);
          await expect(reading).toHaveText(frameEnergyNumber(value) + ' ' + unit);
          expect(await row.evaluate(node => {
            const label = node.querySelector('dt')!, value = node.querySelector('dd')!, row = node.getBoundingClientRect();
            const l = label.getBoundingClientRect(), v = value.getBoundingClientRect();
            return { native: !node.closest('svg,[aria-hidden="true"]'), whitespace: getComputedStyle(value).whiteSpace,
              font: parseFloat(getComputedStyle(value).fontSize), overflow: node.scrollWidth - node.clientWidth,
              inside: l.left >= row.left && l.right <= row.right + 1 && v.left >= row.left && v.right <= row.right + 1 };
          })).toMatchObject({ native: true, whitespace: 'nowrap', font: 12, overflow: 0, inside: true });
        }
        const pair = saved.scene?.comparison;
        const pairValues: number[] = [];
        if (pair) {
          const summary = card.locator('[data-seismic-scene-pair]');
          await expect(summary.locator('[data-saved-input-summary]')).toHaveText([inputText(pair.referenceInputs), inputText(pair.currentInputs)]);
          for (const input of [pair.referenceInputs, pair.currentInputs])
            pairValues.push(oracle.bridgeSeismicSample(oracle.bridgeSeismicResponse(input), saved.timeS).relativeM * 100);
          await expect(summary.locator('[data-seismic-scene-pair-motion] > span')).toHaveText(pairValues.map(value => frameEnergyNumber(value) + ' cm'));
        }
        const values = rows.map(row => row[3]).concat(pairValues);
        for (const input of [saved.inputs, ...(pair ? [pair.referenceInputs, pair.currentInputs] : [])]) values.push(input.intensityG, input.dampingRatio * 100);
        const scientific = values.some(value => value !== 0 && Math.abs(value) < 0.001);
        await expect(card.locator('[data-seismic-scientific-help]')).toHaveCount(scientific ? 1 : 0);
        if (scientific) await expect(card.locator('[data-seismic-scientific-help]')).toContainText('2.5e-6 means 0.0000025');
        const tokens = await card.locator('[data-saved-input-summary] > span, [data-seismic-scene-pair-motion] > span').evaluateAll(nodes => nodes.map(node => {
          const bounds = node.getBoundingClientRect(), outer = node.closest('[data-seismic-trial]')!.getBoundingClientRect();
          return { nowrap: getComputedStyle(node).whiteSpace === 'nowrap', inside: bounds.left >= outer.left && bounds.right <= outer.right };
        }));
        expect(tokens.every(token => token.nowrap && token.inside), 'number and unit stay together within the native card').toBe(true);
        if (saved.prediction) await expect(card).toContainText(saved.prediction);
        if (saved.observation) await expect(card).toContainText(saved.observation.replaceAll('\n', ' '));
        expect(await card.evaluate(node => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1);
        if (printing) await expect(card.locator('button,input,textarea,select')).toHaveCount(0);
        checks.push({ name, time: saved.timeS, rows: rows.map(([group, id, label, value, unit]) => ({ group, id, label, value, unit })), pairValues, scientific, printing });
        return card.locator('[data-saved-reading]').evaluateAll(nodes => nodes.map(node => ({ id: node.getAttribute('data-saved-reading'),
          label: node.querySelector('dt')!.textContent, text: node.querySelector('dd')!.textContent,
          raw: node.querySelector('dd')!.getAttribute('data-saved-reading-value'), unit: node.querySelector('dd')!.getAttribute('data-saved-reading-unit') })));
      }
      async function capture(card: import('@playwright/test').Locator, name: string) {
        const viewport = page.viewportSize()!, before = await bucket();
        const initial = await card.evaluate(node => ({ width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height }));
        try {
          await page.setViewportSize({ width: viewport.width, height: Math.max(viewport.height, Math.ceil(initial.height) + 1500) });
          let bounds: any, previous = '', stable = 0;
          try { await expect.poll(async () => {
            bounds = await card.evaluate(async node => {
              const settle = () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
              await settle(); node.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }); await settle();
              const box = node.getBoundingClientRect(), clips = [];
              for (let parent = node.parentElement; parent; parent = parent.parentElement) {
                if (!/auto|scroll|hidden|clip/.test(getComputedStyle(parent).overflowY)) continue;
                const clip = parent.getBoundingClientRect();
                clips.push({ tag: parent.tagName, id: parent.id, top: clip.top, bottom: clip.bottom,
                  clientHeight: parent.clientHeight, scrollHeight: parent.scrollHeight, scrollTop: parent.scrollTop,
                  overflow: getComputedStyle(parent).overflowY });
              }
              return { width: box.width, top: box.top, bottom: box.bottom, viewport: innerHeight, clips };
            });
            const current = JSON.stringify(bounds); stable = current === previous ? stable + 1 : 1; previous = current;
            return stable >= 2 && Math.abs(bounds.width - initial.width) <= 1 && bounds.top >= 0 && bounds.bottom <= bounds.viewport
              && bounds.clips.every((clip: { top: number; bottom: number }) => bounds.top >= clip.top && bounds.bottom <= clip.bottom);
          }, { timeout: 15000, intervals: [100, 250, 500], message: 'Native saved evidence is stable and completely visible at its original width' }).toBe(true);
          } finally { await writeFile(join(report, 'saved-readings-' + width + '-' + name + '-layout.json'), JSON.stringify({ initial, bounds, stable }, null, 2)); }
          expect(Math.abs(bounds.width - initial.width)).toBeLessThanOrEqual(1);
          expect(bounds.top).toBeGreaterThanOrEqual(0); expect(bounds.bottom).toBeLessThanOrEqual(bounds.viewport);
          for (const clip of bounds.clips) { expect(bounds.top).toBeGreaterThanOrEqual(clip.top); expect(bounds.bottom).toBeLessThanOrEqual(clip.bottom); }
          await card.screenshot({ path: join(report, 'saved-readings-' + width + '-' + name + '.png') });
        } finally {
          await page.setViewportSize(viewport);
          await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
        }
        expect(await bucket(), 'native captures preserve saved records and student writing').toEqual(before);
      }
      const normal = await save('Ordinary response', 'Predict a delayed deck response.', 'The deck keeps moving after shaking ends.');
      const normalReadings = await checkCard(article(0), normal, 'normal'); await capture(article(0), 'normal');
      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 1e-9, seismicDampingRatio: 1e-9, seismicTime: 7.217 }));
      const tiny = await save('Tiny but nonzero', 'Small input still gives a nonzero response.', 'Keep <b>my own explanation</b> literal.');
      const tinyReadings = await checkCard(article(1), tiny, 'tiny');
      await expect(article(1).locator('[data-saved-reading="peak-relative"] dd')).toContainText(/e-\d+ cm/);
      await expect(article(1).locator('[data-saved-input-summary]')).toContainText('1.00e-9 g · 1.00e-7%');
      await expect(article(1).locator('b')).toHaveCount(0); await capture(article(1), 'tiny');
      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 0, seismicDampingRatio: 0.05, seismicTime: 24 }));
      const zero = await save('No ground motion', 'No forcing should give zero response.', 'All saved numerical readings are zero.');
      const zeroReadings = await checkCard(article(2), zero, 'zero');
      expect(zeroReadings.every(row => Number(row.raw) === 0)).toBe(true);
      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 2e-9, seismicDampingRatio: 2e-9, seismicTime: 21.217,
        seismicReferenceIndex: 1, seismicSceneCompare: true, seismicSceneSource: 'saved', seismicSceneTrial: 'reference',
        seismicSceneRecording: true, seismicScenePrediction: 'A and B remain distinct at tiny scales.',
        seismicSceneNote: 'At the same time, compare the signed A and B motion.' }));
      await page.getByRole('button', { name: 'From the riverbank', exact: true }).click();
      await page.getByRole('button', { name: 'A · reference', exact: true }).click();
      const beforeSceneSave = await bucket();
      await page.getByRole('button', { name: 'Save scene observation', exact: true }).click();
      const afterSceneSave = await bucket(), scene = afterSceneSave.seismicTrials[3];
      expect(scene.scene.source).toBe('reference'); expect(scene.scene.comparison.referenceInputs).toEqual(tiny.inputs);
      expect(scene.inputs).toEqual(tiny.inputs); expect(scene.timeS).toBe(21.217);
      expect(afterSceneSave.seismicPrediction).toBe(beforeSceneSave.seismicPrediction);
      expect(afterSceneSave.seismicObservation).toBe(beforeSceneSave.seismicObservation);
      await page.getByRole('button', { name: 'Labelled 2D view', exact: true }).click();
      const sceneReadings = await checkCard(article(3), scene, 'paired-scene');
      await expect(article(3).locator('[data-saved-reading="stored-power"] dd')).toContainText(/-\d\.\d{2}e-\d+ W\/kg/);
      await capture(article(3), 'paired-scene');
      const allSaved = (await bucket()).seismicTrials;
      const originalValues = [normalReadings, tinyReadings, zeroReadings, sceneReadings];
      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 0.3, seismicDampingRatio: 0.4, seismicTime: 2,
        seismicPrediction: 'Unsaved changed prediction.', seismicObservation: 'Unsaved changed observation.',
        seismicScenePrediction: 'Separate scene draft stays.', seismicSceneNote: 'Separate scene draft note stays.' }));
      const restore = page.getByRole('button', { name: 'Restore earthquake trial 2: Tiny but nonzero', exact: true });
      await restore.focus(); await restore.press('Enter');
      expect(await bucket()).toMatchObject({ bridgeView: '2d', seismicIntensityG: tiny.inputs.intensityG,
        seismicDampingRatio: tiny.inputs.dampingRatio, seismicFrequencyHz: tiny.inputs.groundFrequencyHz, seismicTime: tiny.timeS,
        seismicPlaying: false, autoDriving: false, seismicPrediction: tiny.prediction, seismicObservation: tiny.observation,
        seismicScenePrediction: 'Separate scene draft stays.', seismicSceneNote: 'Separate scene draft note stays.' });
      await page.getByRole('button', { name: 'Revisit scene observation 4: ' + scene.name, exact: true }).click();
      expect(await bucket()).toMatchObject({ seismicSceneSource: 'capture', seismicSceneTrial: 'reference', seismicTime: scene.timeS,
        seismicIntensityG: scene.scene.comparison.currentInputs.intensityG, seismicDampingRatio: scene.scene.comparison.currentInputs.dampingRatio,
        seismicPrediction: tiny.prediction, seismicObservation: tiny.observation, seismicScenePrediction: scene.prediction, seismicSceneNote: scene.observation });
      await page.getByRole('button', { name: 'Labelled 2D view', exact: true }).click();
      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 3e-9, seismicDampingRatio: 3e-9,
        seismicTime: 12.319, seismicIntervalPinS: 7.217, seismicEnergyInterval: true,
        seismicPrediction: 'Keep this unsaved draft prediction.', seismicObservation: 'Keep this unsaved draft explanation.' }));
      for (const [index, saved] of [normal, tiny, zero, scene].entries())
        expect(await checkCard(article(index), saved, 'unchanged-' + index)).toEqual(originalValues[index]);
      expect((await bucket()).seismicTrials).toEqual(allSaved);
      const beforePrint = await bucket();
      await page.getByRole('button', { name: 'Open earthquake evidence report', exact: true }).click();
      expect(await bucket()).toEqual({ ...beforePrint, tab: 'print', seismicPlaying: false, autoDriving: false });
      const printed = page.locator('[data-bridge-print-seismic]');
      for (const [index, saved] of [normal, tiny, zero, scene].entries()) {
        const copy = printed.locator('[data-seismic-trial="' + index + '"]');
        expect(await checkCard(copy, saved, 'print-' + index, true)).toEqual(originalValues[index]);
      }
      await expect(printed.locator('[data-notebook-print-draft] [data-saved-input-summary]')).toContainText('3.00e-9 g · 3.00e-7%');
      await expect(printed.locator('[data-notebook-print-draft]')).toContainText('Keep this unsaved draft prediction.');
      await expect(printed.locator('[data-notebook-print-draft]')).toContainText('Keep this unsaved draft explanation.');
      await expect(printed.locator('[data-seismic-trial-comparison]')).toContainText('1.00e-9 g · 1.00e-7%');
      await expect(printed.locator('[data-seismic-trial-comparison]')).toContainText('3.00e-9 g · 3.00e-7%');
      await expect(printed.locator('button,input,textarea,select')).toHaveCount(0);
      await capture(printed.locator('[data-seismic-trial="3"]'), 'paired-scene-print');
      expect((await bucket()).seismicTrials).toEqual(allSaved); await checkWorkflowHealth(page);
      await writeFile(join(report, 'saved-readings-' + width + '-checks.json'), JSON.stringify({ width, checks }, null, 2));
    });
  }

  for (const width of [1000, 320]) {
    test('scan markers: distinguish the tested maximum from the selected frequency at ' + width + 'px', async ({ page }) => {
      test.setTimeout(360_000);
      const report = process.env.BRIDGE_CAPTURE_REPORT || FREQUENCY_REPORT;
      await mkdir(report, { recursive: true });
      const oracle = await loadFrameEnergyOracle(), records: any[] = [];
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await mountWorkflow(page, width, { seismicEnabled: true, seismicArchetype: 'balanced', seismicIntensityG: 0.24,
        seismicDampingRatio: 0.05, seismicFrequencyHz: 2, seismicTime: 7.217, seismicIntervalPinS: 12.319,
        seismicEnergyInterval: true, seismicPlaying: false, autoDriving: false, seismicTrialName: 'Scan reference',
        seismicPrediction: 'Keep my frequency prediction.', seismicObservation: 'Keep my notebook evidence.',
        seismicSceneNote: 'Keep my scene note.' });
      await page.getByRole('button', { name: 'Labelled 2D view', exact: true }).click();
      await page.getByRole('button', { name: 'Save earthquake trial', exact: true }).click();
      const saved = await page.evaluate(() => (window as any).__bucket().seismicTrials);
      const scan = page.locator('[data-bridge-seismic-scan]');
      await scan.locator('summary').click();
      const slider = scan.getByRole('slider', { name: 'Select scanned frequency (Hz)', exact: true });
      const measureSelect = scan.getByRole('combobox', { name: 'Frequency scan measure', exact: true });
      const maximum = scan.locator('[data-seismic-scan-marker="maximum"]');
      type Measure = 'relative' | 'acceleration';
      type ScanRow = { frequencyHz: number; relativeCm: number; accelerationG: number; motionTimeS: number; accelerationTimeS: number };
      function rowsFor(intensityG: number, dampingRatio: number): ScanRow[] {
        // Independently obtain every full-event peak from the physical response.
        // Neither the scan point/summary helper nor any DOM reading feeds this oracle.
        return Array.from({ length: 57 }, (_, index) => {
          const frequencyHz = (4 + index) / 20;
          const response = oracle.bridgeSeismicResponse({ archetype: 'balanced', intensityG, dampingRatio, groundFrequencyHz: frequencyHz });
          return { frequencyHz, relativeCm: response.peaks.relativeM * 100,
            accelerationG: response.peaks.absoluteAccelerationMps2 / 9.80665,
            motionTimeS: response.milestones.peakMotionS, accelerationTimeS: response.milestones.peakAccelerationS };
        });
      }
      function bestFor(rows: ScanRow[], measure: Measure) {
        const field = measure === 'relative' ? 'relativeCm' : 'accelerationG';
        return rows.reduce((best, row, index) => row[field] > rows[best][field] ? index : best, 0);
      }
      function close(actual: number, expected: number, label: string) {
        if (expected === 0) expect(actual, label).toBe(0);
        else expect(Math.abs(actual - expected), label).toBeLessThanOrEqual(Math.abs(expected) * 2e-9);
      }
      async function bucket() { return page.evaluate(() => (window as any).__bucket()); }
      async function runScan() {
        const before = await bucket();
        await scan.getByRole('button', { name: 'Run frequency scan', exact: true }).click();
        await expect(scan.locator('[data-seismic-scan-status]')).toHaveAttribute('data-seismic-scan-status', 'complete', { timeout: 60000 });
        expect(await bucket(), 'running a scan keeps the current experiment and notebook intact').toEqual(before);
      }
      async function check(rows: ScanRow[], measure: Measure, index: number, name: string) {
        const selected = rows[index], field = measure === 'relative' ? 'relativeCm' : 'accelerationG', unit = measure === 'relative' ? 'cm' : 'g';
        const best = bestFor(rows, measure), largest = rows[best], value = largest[field], positive = value > 0;
        const scale = Math.max(0.001, value) * 1.04;
        await expect(slider).toHaveAttribute('aria-valuenow', String(selected.frequencyHz));
        await expect(slider).toHaveAttribute('aria-valuetext', selected.frequencyHz.toFixed(2) + ' Hz · ' + frameEnergyNumber(selected[field]) + ' ' + unit);
        await expect(slider).toHaveAttribute('aria-describedby', 'bridge-seismic-scan-help');
        await expect(scan.locator('[data-seismic-scan-selected]')).toHaveAttribute('data-seismic-scan-selected', String(selected.frequencyHz));
        for (const [id, wanted, label, readingUnit] of [
          ['relative', selected.relativeCm, 'Peak relative motion', 'cm'],
          ['acceleration', selected.accelerationG, 'Peak deck acceleration', 'g']
        ] as const) {
          const reading = scan.locator('[data-seismic-scan-reading="' + id + '"]');
          close(Number(await reading.getAttribute('data-scan-value')), wanted, id + ' independent peak');
          await expect(reading).toHaveText(label + ': ' + frameEnergyNumber(wanted) + ' ' + readingUnit);
          expect(await reading.evaluate(node => !node.closest('svg,[aria-hidden="true"]')), 'readings are native visible text').toBe(true);
        }
        // Preserve the existing selected-card child positions used by other flows.
        expect(await scan.locator('[data-seismic-scan-selected]').evaluate(node =>
          [node.children[1].getAttribute('data-seismic-scan-reading'), node.children[2].getAttribute('data-seismic-scan-reading')]))
          .toEqual(['relative', 'acceleration']);
        const card = scan.locator('[data-seismic-scan-maximum]');
        close(Number(await card.getAttribute('data-scan-value')), value, 'independent full-scan maximum');
        await expect(maximum).toHaveCount(positive ? 1 : 0);
        await expect(scan.locator('[data-seismic-scan-coincident]')).toHaveCount(positive && index === best ? 1 : 0);
        if (positive) {
          await expect(card).toHaveAttribute('data-scan-frequency', String(largest.frequencyHz));
          await expect(card).toHaveText('◇ Largest tested response for this measure: ' + largest.frequencyHz.toFixed(2) + ' Hz · ' + frameEnergyNumber(value) + ' ' + unit);
        } else {
          expect(await card.getAttribute('data-scan-frequency')).toBeNull();
          await expect(card).toContainText('All responses are zero');
        }
        if (positive) await expect(scan.getByRole('button', { name: 'Select largest response', exact: true })).toBeEnabled();
        else await expect(scan.getByRole('button', { name: 'Select largest response', exact: true })).toBeDisabled();
        await expect(scan.locator('[data-seismic-scan-marker-help]')).toContainText('Diamond: first largest tested response');
        await expect(scan.locator('[data-seismic-scan-marker-help]')).toContainText('vertical scale is fixed for this scan and measure');
        const actual = await slider.evaluate(node => {
          const plot = node.getBoundingClientRect(), outer = node.closest('[data-bridge-seismic-scan]')!.getBoundingClientRect();
          const markers = [...node.querySelectorAll<SVGSVGElement>('[data-seismic-scan-marker]')].map(marker => {
            const box = marker.getBoundingClientRect(), shape = marker.firstElementChild as SVGGraphicsElement;
            const body = shape.getBoundingClientRect();
            return { id: marker.getAttribute('data-seismic-scan-marker'), frequency: Number(marker.getAttribute('data-scan-frequency')),
              value: Number(marker.getAttribute('data-scan-value')), width: box.width, height: box.height,
              x: box.left + box.width / 2 - plot.left, y: box.top + box.height / 2 - plot.top,
              hidden: marker.getAttribute('aria-hidden'), focusable: marker.getAttribute('focusable'), pointer: getComputedStyle(marker).pointerEvents,
              nativeViewport: marker.parentElement === node, insideOuter: box.left >= outer.left && box.right <= outer.right,
              shape: { tag: shape.tagName, width: body.width, height: body.height, fill: shape.getAttribute('fill'),
                stroke: shape.getAttribute('stroke'), path: shape.getAttribute('d'), radius: shape.getAttribute('r') } };
          });
          return { width: plot.width, height: plot.height, markers,
            points: node.querySelector('[data-seismic-scan-curve]')!.getAttribute('points')!.split(' ').map(pair => pair.split(',').map(Number)) };
        });
        expect(actual.points).toHaveLength(57);
        for (let i = 0; i < 57; i++) {
          expect(Math.abs(actual.points[i][0] - (rows[i].frequencyHz - 0.2) / 2.8 * 600)).toBeLessThanOrEqual(0.006);
          expect(Math.abs(actual.points[i][1] - (172 - rows[i][field] / scale * 164))).toBeLessThanOrEqual(0.006);
        }
        expect(actual.height).toBe(180);
        for (const marker of actual.markers) {
          const isMaximum = marker.id === 'maximum', row = isMaximum ? largest : selected, size = isMaximum ? 20 : 16;
          expect(marker.frequency).toBe(row.frequencyHz);
          close(marker.value, row[field], marker.id + ' marker uses its own physical response');
          expect(marker.width).toBe(size); expect(marker.height).toBe(size);
          expect(Math.abs(marker.x - (row.frequencyHz - 0.2) / 2.8 * actual.width)).toBeLessThanOrEqual(0.05);
          expect(Math.abs(marker.y - (172 - row[field] / scale * 164))).toBeLessThanOrEqual(0.05);
          expect(marker.hidden).toBe('true'); expect(marker.focusable).toBe('false'); expect(marker.pointer).toBe('none');
          expect(marker.nativeViewport).toBe(true); expect(marker.insideOuter).toBe(true);
          expect(Math.abs(marker.shape.width - (isMaximum ? 16 : 8))).toBeLessThanOrEqual(0.05);
          expect(Math.abs(marker.shape.height - (isMaximum ? 16 : 8))).toBeLessThanOrEqual(0.05);
          expect(Math.abs(marker.shape.width - marker.shape.height), 'the circle stays round and the diamond stays square').toBeLessThanOrEqual(0.05);
          expect(marker.shape.fill).toBe(isMaximum ? 'none' : '#fbbf24');
          expect(marker.shape.stroke).toBe(isMaximum ? '#e2e8f0' : '#0f172a');
          if (isMaximum) { expect(marker.shape.tag).toBe('path'); expect(marker.shape.path).toBe('M10 2 l8 8 -8 8 -8 -8 Z'); }
          else { expect(marker.shape.tag).toBe('circle'); expect(marker.shape.radius).toBe('4'); }
        }
        if (positive && index === best) {
          expect(Math.abs(actual.markers[0].x - actual.markers[1].x)).toBeLessThanOrEqual(0.02);
          expect(Math.abs(actual.markers[0].y - actual.markers[1].y)).toBeLessThanOrEqual(0.02);
          await expect(scan.locator('[data-seismic-scan-coincident]')).toContainText('circle sits inside the diamond');
        }
        expect(await scan.evaluate(node => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1);
        records.push({ name, measure, selected: selected.frequencyHz, maximum: positive ? largest.frequencyHz : null,
          value, markers: actual.markers, points: actual.points.length });
      }
      async function capture(name: string) {
        const viewport = page.viewportSize()!, before = await bucket();
        const initial = await scan.evaluate(node => ({ width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height }));
        try {
          // Keep the actual pane width and native styling, extending only the
          // viewport height so the complete disclosure is visible in the image.
          await page.setViewportSize({ width: viewport.width, height: Math.max(viewport.height, Math.ceil(initial.height) + 1500) });
          let bounds: any, previous = '', stable = 0;
          try { await expect.poll(async () => {
            bounds = await scan.evaluate(async node => {
              const settle = () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
              // Resize and native scroll anchoring settle asynchronously. Scroll
              // after the new layout, then inspect the resulting native clips.
              await settle();
              node.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
              await settle();
              const box = node.getBoundingClientRect();
              const clips = [];
              for (let parent = node.parentElement; parent; parent = parent.parentElement) {
                if (!/auto|scroll|hidden|clip/.test(getComputedStyle(parent).overflowY)) continue;
                const clip = parent.getBoundingClientRect();
                clips.push({ tag: parent.tagName, id: parent.id,
                  hooks: [...parent.attributes].filter(attribute => attribute.name.startsWith('data-') || attribute.name === 'role')
                    .map(attribute => [attribute.name, attribute.value]),
                  top: clip.top, bottom: clip.bottom, height: clip.height,
                  clientHeight: parent.clientHeight, scrollHeight: parent.scrollHeight, scrollTop: parent.scrollTop,
                  overflow: getComputedStyle(parent).overflowY });
              }
              return { width: box.width, top: box.top, bottom: box.bottom, viewport: innerHeight, clips };
            });
            const current = JSON.stringify(bounds);
            stable = current === previous ? stable + 1 : 1;
            previous = current;
            return stable >= 2 && Math.abs(bounds.width - initial.width) <= 1
              && bounds.top >= 0 && bounds.bottom <= bounds.viewport
              && bounds.clips.every((clip: { top: number; bottom: number }) => bounds.top >= clip.top && bounds.bottom <= clip.bottom);
          }, { timeout: 15000, intervals: [100, 250, 500], message: 'Native scan capture is stable and fully contained at its original width' }).toBe(true);
          } finally {
            await writeFile(join(report, 'scan-markers-' + width + '-' + name + '-layout.json'), JSON.stringify({ initial, bounds, stable }, null, 2));
          }
          expect(Math.abs(bounds.width - initial.width)).toBeLessThanOrEqual(1);
          expect(bounds.top).toBeGreaterThanOrEqual(0); expect(bounds.bottom).toBeLessThanOrEqual(bounds.viewport);
          for (const clip of bounds.clips) { expect(bounds.top).toBeGreaterThanOrEqual(clip.top); expect(bounds.bottom).toBeLessThanOrEqual(clip.bottom); }
          await scan.screenshot({ path: join(report, 'scan-markers-' + width + '-' + name + '.png') });
        } finally {
          await page.setViewportSize(viewport);
          await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
        }
        expect(await bucket(), 'native capture preserves all experiment and notebook state').toEqual(before);
      }
      const normalRows = rowsFor(0.24, 0.05);
      await runScan();
      for (const measure of ['relative', 'acceleration'] as const) {
        await measureSelect.selectOption(measure);
        const before = await bucket(), fixed = await maximum.evaluate(node => node.outerHTML);
        await check(normalRows, measure, 36, measure + '-initial');
        if (measure === 'relative') await capture('normal');
        await slider.focus(); await slider.press('Home'); await check(normalRows, measure, 0, measure + '-lower-end');
        await expect(scan.getByRole('button', { name: 'Previous frequency', exact: true })).toBeDisabled();
        await slider.press('End'); await check(normalRows, measure, 56, measure + '-upper-end');
        await expect(scan.getByRole('button', { name: 'Next frequency', exact: true })).toBeDisabled();
        await slider.press('PageDown'); await check(normalRows, measure, 51, measure + '-keyboard');
        await slider.scrollIntoViewIfNeeded();
        const box = await slider.boundingBox(); if (!box) throw Error('Frequency scan is not visible');
        await page.mouse.move(box.x + box.width * 0.25, box.y + box.height / 2); await page.mouse.down();
        await page.mouse.move(box.x + box.width * 0.5, box.y + box.height / 2, { steps: 3 }); await page.mouse.up();
        await expect(slider).toBeFocused(); await check(normalRows, measure, 28, measure + '-pointer');
        expect(await maximum.evaluate(node => node.outerHTML), 'moving selection leaves the largest-response marker fixed').toBe(fixed);
        await scan.getByRole('button', { name: 'Select largest response', exact: true }).click();
        await check(normalRows, measure, bestFor(normalRows, measure), measure + '-coincident');
        expect(await bucket(), 'point selection changes neither the experiment nor saved evidence').toEqual(before);
        if (measure === 'acceleration') await capture('coincident');
        // Restore a known selected point without applying it to the experiment.
        await slider.press('Home'); for (let i = 0; i < 7; i++) await slider.press('PageUp'); await slider.press('ArrowRight');
      }
      await scan.getByRole('button', { name: 'Select largest response', exact: true }).click();
      const inspectionBefore = await bucket(), selected = normalRows[bestFor(normalRows, 'acceleration')];
      await scan.getByRole('button', { name: 'Inspect this frequency', exact: true }).click();
      await expect(page.locator('[data-bridge-elevation]')).toBeFocused();
      const inspectionAfter = await bucket();
      close(inspectionAfter.seismicTime, selected.accelerationTimeS, 'inspection uses the recorded acceleration milestone');
      expect(inspectionAfter).toEqual({ ...inspectionBefore, seismicFrequencyHz: selected.frequencyHz,
        seismicTime: inspectionAfter.seismicTime, seismicPlaying: false, autoDriving: false, seismicSceneTrial: 'current' });
      expect(inspectionAfter.seismicTrials).toEqual(saved);
      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 1e-9, seismicDampingRatio: 1e-9 }));
      await expect(scan.locator('[data-seismic-scan-status]')).toHaveAttribute('data-seismic-scan-status', 'stale');
      await expect(scan.locator('[data-seismic-scan-results]')).toHaveCount(0);
      await expect(scan.locator('[data-seismic-scan-marker]')).toHaveCount(0);
      await runScan(); const tinyRows = rowsFor(1e-9, 1e-9);
      for (const measure of ['relative', 'acceleration'] as const) {
        await measureSelect.selectOption(measure); await scan.getByRole('button', { name: 'Select largest response', exact: true }).click();
        await check(tinyRows, measure, bestFor(tinyRows, measure), measure + '-tiny');
        await expect(scan.locator('[data-seismic-scan-inputs]')).toContainText('1.00e-9 g · 1.00e-7%');
        await expect(scan.locator('[data-seismic-scan-reading="' + measure + '"]')).toContainText(/e-\d+/);
        await expect(slider).toHaveAttribute('aria-valuetext', /e-\d+ (?:cm|g)$/);
        await expect(scan.locator('[data-seismic-scan-scientific-help]')).toContainText('A reading written with e is still nonzero');
        if (measure === 'relative') await capture('tiny');
      }
      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 0, seismicDampingRatio: 0.05 }));
      await expect(scan.locator('[data-seismic-scan-status]')).toHaveAttribute('data-seismic-scan-status', 'stale');
      await expect(scan.locator('[data-seismic-scan-results]')).toHaveCount(0);
      await runScan(); const zeroRows = rowsFor(0, 0.05);
      for (const measure of ['relative', 'acceleration'] as const) {
        await measureSelect.selectOption(measure); await slider.press('Home');
        await check(zeroRows, measure, 0, measure + '-zero');
        await expect(scan.locator('[data-seismic-scan-scientific-help]')).toHaveCount(0);
      }
      await capture('zero'); await checkWorkflowHealth(page);
      expect((await bucket()).seismicTrials).toEqual(saved);
      await writeFile(join(report, 'scan-markers-' + width + '-checks.json'), JSON.stringify({ width, records }, null, 2));
    });
  }
  for (const width of [1000, 320]) {
    test('replay interval: exact pin, chronological span and independent inspection at ' + width + 'px', async ({ page }) => {
      test.setTimeout(360_000);
      const report = process.env.BRIDGE_CAPTURE_REPORT || ENHANCEMENT_REPORT;
      await mkdir(report, { recursive: true });
      const oracle = await loadFrameEnergyOracle(), records: any[] = [];
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await mountWorkflow(page, width, { bridgeView: 'immersive', bridgeObserver: 'bank', seismicEnabled: true,
        seismicArchetype: 'stiff', seismicIntensityG: 0.12, seismicDampingRatio: 0.05, seismicFrequencyHz: 1.1,
        seismicTime: 7.217, seismicIntervalPinS: 12.319, seismicEnergyInterval: false,
        seismicPlaying: false, autoDriving: false, crossSectionMm2: 30000, lateralBraceEvery: 1,
        seismicTrialName: 'Timeline reference', seismicPrediction: 'Keep the prediction.',
        seismicObservation: 'Keep the notebook evidence.', seismicSceneNote: 'Keep the scene note.' });
      await page.getByRole('button', { name: 'Save earthquake trial', exact: true }).click();
      const saved = await page.evaluate(() => (window as any).__bucket().seismicTrials);
      await page.getByRole('button', { name: 'From the riverbank', exact: true }).click();
      await page.evaluate(() => (window as any).__set({ seismicArchetype: 'flexible', seismicIntensityG: 0.24,
        seismicDampingRatio: 0.2, seismicSceneCompare: true, seismicSceneSource: 'saved',
        seismicSceneTrial: 'reference', seismicReferenceIndex: 0 }));
      const timeline = page.locator('[data-bridge-seismic-timeline]');
      const slider = timeline.locator('[data-seismic-chart-slider]');
      const caption = timeline.locator('[data-seismic-interval-caption]');
      const pinMarker = slider.locator('[data-seismic-pin-marker]');
      type Kind = 'energy' | 'motion' | 'comparison';
      type Measure = 'relative' | 'acceleration' | 'stored';
      async function chartSnapshot() {
        return slider.evaluate(node => ({
          chart: [...node.querySelector(':scope > svg')!.children]
            .filter(child => !child.hasAttribute('data-seismic-interval-band') && !child.hasAttribute('data-seismic-interval-pin'))
            .map(child => child.outerHTML),
          peaks: [...node.querySelectorAll('[data-recorded-peak-marker]')].map(child => child.outerHTML),
          value: node.getAttribute('aria-valuenow'), text: node.getAttribute('aria-valuetext')
        }));
      }
      async function geometry(pin: number, time: number) {
        const earlier = Math.min(pin, time), later = Math.max(pin, time), elapsed = later - earlier;
        await expect(caption).toHaveAttribute('data-interval-pin', String(pin));
        await expect(caption).toHaveAttribute('data-interval-inspected', String(time));
        await expect(caption).toHaveAttribute('data-interval-start', String(earlier));
        await expect(caption).toHaveAttribute('data-interval-end', String(later));
        await expect(slider).toHaveAttribute('aria-describedby', 'bridge-seismic-timeline-help bridge-seismic-interval-help' + ((await timeline.getAttribute('data-bridge-seismic-timeline')) === 'motion' ? ' bridge-seismic-motion-gap-help' : ''));
        await expect(slider).toHaveAttribute('aria-valuenow', String(time));
        await expect(caption.locator('[data-seismic-interval-pin-caption]')).toHaveText('□ Pin · ' + pin.toFixed(3) + ' s');
        await expect(caption.locator('[data-seismic-interval-inspected-caption]')).toHaveText('Inspected · ' + time.toFixed(3) + ' s');
        await expect(caption.locator('[data-seismic-interval-range]')).toHaveText('Energy comparison interval · '
          + earlier.toFixed(3) + '–' + later.toFixed(3) + ' s · Elapsed: ' + frameEnergyNumber(elapsed) + ' s');
        await expect(caption.locator('p')).toHaveText(elapsed === 0
          ? 'Pin and inspected time coincide; elapsed time is zero.'
          : 'Shading spans the earlier and later moments. The dashed line and square mark the pin; the solid line marks the inspected time.');
        await expect(caption).toHaveAttribute('aria-live', 'off');
        const actual = await slider.evaluate(node => {
          const svg = node.querySelector(':scope > svg') as SVGSVGElement;
          const marker = node.querySelector('[data-seismic-pin-marker]') as SVGSVGElement;
          const square = marker.querySelector('rect')!, pin = svg.querySelector('[data-seismic-interval-pin]')!;
          const cursor = svg.querySelector('[data-seismic-time-cursor]')!;
          const band = svg.querySelector('[data-seismic-interval-band]');
          const rect = band?.querySelector('rect'), edge = band?.querySelector('line');
          const r = node.getBoundingClientRect(), m = marker.getBoundingClientRect(), c = square.getBoundingClientRect();
          const section = node.closest('[data-bridge-seismic-timeline]')!, s = section.getBoundingClientRect();
          const cap = section.querySelector('[data-seismic-interval-caption]')!;
          const painted = (shape: SVGGraphicsElement) => {
            const box = shape.getBoundingClientRect(), matrix = shape.getScreenCTM()!;
            const stroke = parseFloat(getComputedStyle(shape).strokeWidth) / 2;
            const sx = stroke * Math.hypot(matrix.a, matrix.c), sy = stroke * Math.hypot(matrix.b, matrix.d);
            return { left: box.left - sx - r.left, right: box.right + sx - r.left,
              top: box.top - sy - r.top, bottom: box.bottom + sy - r.top };
          };
          return { width: r.width, marker: { time: marker.getAttribute('data-seismic-pin-marker'),
            width: m.width, height: m.height, center: m.x + m.width / 2 - r.x, top: m.top - r.top,
            viewBox: marker.getAttribute('viewBox'), hidden: marker.getAttribute('aria-hidden'), focusable: marker.getAttribute('focusable'),
            cssLeft: marker.style.left, insideSection: m.left >= s.left && m.right <= s.right,
            square: { x: square.getAttribute('x'), y: square.getAttribute('y'), width: square.getAttribute('width'),
              height: square.getAttribute('height'), stroke: square.getAttribute('stroke'), screenWidth: c.width, screenHeight: c.height } },
            pin: { time: pin.getAttribute('data-seismic-interval-pin'), x1: Number(pin.getAttribute('x1')), x2: Number(pin.getAttribute('x2')),
              y1: Number(pin.getAttribute('y1')), y2: Number(pin.getAttribute('y2')), dash: pin.getAttribute('stroke-dasharray'),
              effect: pin.getAttribute('vector-effect') },
            cursor: { time: cursor.getAttribute('data-seismic-time-cursor'), x: Number(cursor.getAttribute('x1')), dash: cursor.getAttribute('stroke-dasharray') },
            band: band ? { start: band.getAttribute('data-interval-start'), end: band.getAttribute('data-interval-end'),
              x: Number(rect!.getAttribute('x')), width: Number(rect!.getAttribute('width')), height: Number(rect!.getAttribute('height')),
              edge: [edge!.getAttribute('x1'), edge!.getAttribute('x2')].map(Number), behindCursor: !!(band.compareDocumentPosition(cursor) & Node.DOCUMENT_POSITION_FOLLOWING) } : null,
            captionNative: !cap.closest('svg,[aria-hidden="true"]') && !!cap.getClientRects().length,
            pinPaint: painted(square), axisBottom: node.previousElementSibling!.getBoundingClientRect().bottom - r.top,
            peaks: [...node.querySelectorAll('[data-recorded-peak-marker]')].map(peak => ({
              trial: peak.getAttribute('data-recorded-peak-marker'), time: Number(peak.getAttribute('data-recorded-peak-time')),
              paint: painted(peak.querySelector('svg')!.firstElementChild as SVGGraphicsElement)
            })),
            overflow: section.scrollWidth - section.clientWidth,
            finiteCurves: [...svg.querySelectorAll('[points]')].every(curve => !/NaN|Infinity/.test(curve.getAttribute('points')!)) };
        });
        expect(actual.marker).toMatchObject({ time: String(pin), width: 16, height: 16, top: -10,
          viewBox: '0 0 16 16', hidden: 'true', focusable: 'false', insideSection: true,
          square: { x: '4', y: '4', width: '8', height: '8', stroke: '#e2e8f0', screenWidth: 8, screenHeight: 8 } });
        expect(Math.abs(actual.marker.center - pin / 24 * actual.width)).toBeLessThanOrEqual(0.03);
        expect(parseFloat(actual.marker.cssLeft)).toBeCloseTo(pin / 24 * 100, 4);
        expect(actual.pin).toEqual({ time: String(pin), x1: pin / 24 * 600, x2: pin / 24 * 600,
          y1: 0, y2: 180, dash: '6 4', effect: 'non-scaling-stroke' });
        expect(actual.cursor).toEqual({ time: String(time), x: time / 24 * 600, dash: null });
        if (elapsed === 0) expect(actual.band).toBeNull();
        else expect(actual.band).toEqual({ start: String(earlier), end: String(later), x: earlier / 24 * 600,
          width: later / 24 * 600 - earlier / 24 * 600, height: 180,
          edge: [earlier / 24 * 600, later / 24 * 600], behindCursor: true });
        expect(actual.captionNative).toBe(true); expect(actual.finiteCurves).toBe(true);
        expect(actual.pinPaint.top, 'the complete pin stroke clears the native axis heading').toBeGreaterThanOrEqual(actual.axisBottom);
        for (const peak of actual.peaks) {
          const p = actual.pinPaint, q = peak.paint;
          expect(p.right <= q.left || q.right <= p.left || p.bottom <= q.top || q.bottom <= p.top,
            'pin square and ' + peak.trial + ' recorded maximum strokes remain separate').toBe(true);
        }
        expect(actual.overflow).toBeLessThanOrEqual(1);
        return actual;
      }
      async function capture(name: string) {
        const before = await page.evaluate(() => (window as any).__bucket());
        // The section's native padding includes the complete pin at both edges.
        // Capturing the outer section also retains the real chart, axis and caption.
        await captureImmersiveRegion(page, timeline, 'replay-interval-' + width + '-' + name + '.png', report);
        expect(await page.evaluate(() => (window as any).__bucket())).toEqual(before);
      }
      async function check(kind: Kind, pin: number, time: number, label: string, measure: Measure = 'relative', screenshot = false) {
        await page.evaluate(patch => (window as any).__set(patch), { seismicTimeline: kind, seismicCompareMeasure: measure,
          seismicIntervalPinS: pin, seismicTime: time, seismicEnergyInterval: false });
        const expectedKind = kind === 'comparison' && !(await page.evaluate(() => (window as any).__bucket().seismicTrials.length)) ? 'energy' : kind;
        await expect(timeline).toHaveAttribute('data-bridge-seismic-timeline', expectedKind);
        await expect(caption).toHaveCount(0); await expect(pinMarker).toHaveCount(0);
        await expect(slider).toHaveAttribute('aria-describedby', 'bridge-seismic-timeline-help' + (expectedKind === 'motion' ? ' bridge-seismic-motion-gap-help' : ''));
        const markup = await timeline.innerHTML(), baseline = await chartSnapshot();
        const before = await page.evaluate(() => (window as any).__bucket());
        await page.evaluate(() => (window as any).__set({ seismicEnergyInterval: true }));
        const actual = await geometry(pin, time);
        expect(await chartSnapshot(), 'the interval leaves curves, current markers, maxima and slider readings intact').toEqual(baseline);
        if (expectedKind === 'comparison') {
          const inputs = await flowCurrentInputs(page), current = oracle.bridgeSeismicResponse(inputs);
          const reference = oracle.bridgeSeismicResponse(saved[0].inputs);
          const metric = { relative: ['relativeM', 100], acceleration: ['absoluteAccelerationMps2', 1 / 9.80665], stored: ['storedJPerKg', 1] }[measure];
          const values = [reference, current].map(record => oracle.bridgeSeismicSample(record, time)[metric[0] as string] * Number(metric[1]));
          for (const [index, id] of ['reference', 'current'].entries()) {
            const actualValue = Number(await timeline.locator('[data-seismic-compare-value="' + id + '"]').getAttribute('data-comparison-frame-value'));
            expect(Math.abs(actualValue - values[index])).toBeLessThanOrEqual(Math.max(...values.map(Math.abs)) * 2e-10);
          }
        }
        if (screenshot) await capture(label);
        expect(await page.evaluate(() => (window as any).__bucket())).toEqual({ ...before, seismicEnergyInterval: true });
        await page.evaluate(() => (window as any).__set({ seismicEnergyInterval: false }));
        await expect(caption).toHaveCount(0);
        expect(await timeline.innerHTML(), 'closing the interval restores the entire previous timeline').toBe(markup);
        expect(await page.evaluate(() => (window as any).__bucket())).toEqual(before);
        records.push({ label, kind: expectedKind, measure, pin, time, actual });
        return actual;
      }
      await check('comparison', 12.319, 7.217, 'scene-reference', 'relative');
      const sceneReferenceMarkup = await timeline.innerHTML();
      await page.getByRole('button', { name: 'B · current', exact: true }).click();
      expect(await timeline.innerHTML(), 'scene A/B selection does not relabel the main timeline current experiment').toBe(sceneReferenceMarkup);
      await page.getByRole('button', { name: 'A · reference', exact: true }).click();
      await page.getByRole('button', { name: 'Labelled 2D view', exact: true }).click();
      await check('energy', 7.217, 12.319, 'forward');
      await check('energy', 12.319, 7.217, 'reversed');
      await check('energy', 7.217, 7.217, 'same');
      await check('energy', 12.319, 21.217, 'across-shaking-end', 'relative', true);
      await check('motion', 0, 24, 'pin-start', 'relative', true);
      await check('motion', 24, 0, 'pin-end');
      await check('motion', 7.217, 7.2170001, 'tiny-duration');
      for (const measure of ['relative', 'acceleration', 'stored'] as Measure[]) {
        await check('comparison', 21.217, 12.319, 'comparison-' + measure, measure, measure === 'relative');
      }
      const currentResponse = oracle.bridgeSeismicResponse(await flowCurrentInputs(page));
      const storedMaximum = currentResponse.samples.reduce((best: any, point: any) =>
        point.storedJPerKg > best.storedJPerKg ? point : best);
      expect(storedMaximum.storedJPerKg).toBeGreaterThan(0);
      const peakPin = await check('comparison', storedMaximum.timeS, 12.319, 'pin-at-recorded-maximum', 'stored', true);
      const currentPeak = peakPin.peaks.find(peak => peak.trial === 'current')!;
      expect(currentPeak.time).toBe(storedMaximum.timeS);
      expect(Math.abs((currentPeak.paint.left + currentPeak.paint.right) / 2 - peakPin.marker.center)).toBeLessThanOrEqual(0.03);
      expect(peakPin.pinPaint.bottom, 'coincident horizontal positions keep both peak and pin strokes visible').toBeLessThan(currentPeak.paint.top);
      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 0 }));
      await check('energy', 0, 24, 'zero-response');
      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 0.24, seismicEnergyInterval: true,
        seismicTimeline: 'motion', seismicIntervalPinS: 12.319, seismicTime: 7.217 }));
      const beforeInput = await page.evaluate(() => (window as any).__bucket());
      for (const [key, time] of [['Home', 0], ['ArrowRight', 0.05], ['End', 24], ['ArrowLeft', 23.95]] as const) {
        await slider.press(key);
        await expect(slider).toHaveAttribute('aria-valuenow', String(time));
        await geometry(12.319, time);
        expect(await page.evaluate(() => (window as any).__bucket())).toEqual({ ...beforeInput, seismicTime: time,
          seismicPlaying: false, autoDriving: false });
      }
      await slider.scrollIntoViewIfNeeded();
      const box = await slider.boundingBox();
      if (!box) throw new Error('Timeline chart is not visible');
      await page.mouse.move(box.x + box.width / 4, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 3 / 4, box.y + box.height / 2, { steps: 4 });
      await page.mouse.up();
      await expect(slider).toHaveAttribute('aria-valuenow', '18');
      await expect(slider).toBeFocused();
      await geometry(12.319, 18);
      expect(await page.evaluate(() => (window as any).__bucket())).toEqual({ ...beforeInput, seismicTime: 18,
        seismicPlaying: false, autoDriving: false });
      expect(await page.evaluate(() => (window as any).__bucket().seismicTrials)).toEqual(saved);
      await page.evaluate(() => (window as any).__set({ seismicTrials: [] }));
      await check('comparison', 12.319, 7.217, 'missing-reference');
      await expect(timeline.getByRole('button', { name: 'Compare trials', exact: true })).toBeDisabled();
      await checkWorkflowHealth(page);
      await writeFile(join(report, 'replay-interval-' + width + '-state.json'), JSON.stringify({ width, records, inputChecks: 5 }, null, 2));
    });
  }
  for (const width of [1000, 320]) {
    test('force rulers: labelled arrows, shared scale and force balance at ' + width + 'px', async ({ page }) => {
      test.setTimeout(360_000);
      const report = process.env.BRIDGE_CAPTURE_REPORT || ENHANCEMENT_REPORT;
      await mkdir(report, { recursive: true });
      const oracle = await loadFrameEnergyOracle(), responses = new Map<string, any>(), records: any[] = [];
      await mountWorkflow(page, width, { bridgeView: 'immersive', bridgeObserver: 'bank', seismicEnabled: true,
        seismicIntensityG: 0.12, seismicDampingRatio: 0.05, seismicFrequencyHz: 1.1, seismicArchetype: 'stiff',
        seismicTime: 7.217, seismicForceLens: true, seismicPlaying: false, autoDriving: false,
        seismicReadoutCollapsed: false, crossSectionMm2: 30000, lateralBraceEvery: 1,
        seismicTrialName: 'Force ruler reference', seismicObservation: 'Compare spring and damping directions.',
        seismicSceneNote: 'Keep the force explanation.', seismicIntervalPinS: 12.319 });
      await page.getByRole('button', { name: 'Save earthquake trial', exact: true }).click();
      const savedInputs = await page.evaluate(() => (window as any).__bucket().seismicTrials[0].inputs);
      await page.getByRole('button', { name: 'From the riverbank', exact: true }).click();
      await page.evaluate(() => (window as any).__set({ seismicArchetype: 'flexible', seismicIntensityG: 0.24,
        seismicDampingRatio: 0.2, seismicSceneCompare: true, seismicSceneSource: 'saved',
        seismicReferenceIndex: 0, seismicSceneTrial: 'reference' }));
      type Scope = 'scene' | 'fallback';
      type Trial = 'reference' | 'current';
      const lens = (scope: Scope) => page.locator('[data-bridge-force-lens="' + scope + '"]');
      function response(inputs: GuideInputs) {
        const key = JSON.stringify(Object.keys(inputs).sort().map(name => [name, inputs[name]]));
        if (!responses.has(key)) responses.set(key, oracle.bridgeSeismicResponse(inputs));
        return responses.get(key);
      }
      // Read only motion records. No force-frame, force-limit or DOM helper
      // contributes to expected force signs, magnitudes, limits or endpoints.
      function forces(record: any, point: any) {
        const omega = 2 * Math.PI * record.naturalFrequencyHz;
        const spring = -omega * omega * point.relativeM;
        const damping = -2 * record.settings.dampingRatio * omega * point.velocityMps;
        return { spring, damping, net: spring + damping };
      }
      function maximum(record: any) {
        const omega = 2 * Math.PI * record.naturalFrequencyHz;
        return Math.max(omega * omega * record.peaks.relativeM,
          2 * record.settings.dampingRatio * omega * record.peaks.velocityMps,
          record.peaks.absoluteAccelerationMps2);
      }
      const signed = (value: number) => (value > 0 ? '+' : '') + frameEnergyNumber(value);
      async function reachable(frame: import('@playwright/test').Locator) {
        for (const selector of ['[data-force-ruler="spring"]', '[data-force-ruler="damping"]',
          '[data-force-ruler="net"]', '[data-force-axis]', '[data-force-scale-caption]', '[data-force-ruler-help]']) {
          const part = frame.locator(selector);
          await part.evaluate(node => node.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }));
          const bounds = await part.evaluate(node => {
            const r = node.getBoundingClientRect(), p = node.closest('[data-bridge-scene-readout]')?.getBoundingClientRect();
            return { top: r.top, bottom: r.bottom, left: r.left, right: r.right,
              panelTop: p?.top ?? 0, panelBottom: p?.bottom ?? innerHeight, viewportWidth: innerWidth };
          });
          expect(bounds.top, selector + ' is reachable').toBeGreaterThanOrEqual(bounds.panelTop);
          expect(bounds.bottom, selector + ' is not clipped').toBeLessThanOrEqual(bounds.panelBottom);
          expect(bounds.left).toBeGreaterThanOrEqual(0);
          expect(bounds.right).toBeLessThanOrEqual(bounds.viewportWidth);
        }
      }
      async function capturePlot(frame: import('@playwright/test').Locator, name: string) {
        await reachable(frame);
        const plot = frame.locator('[data-force-plot]');
        const before = await page.evaluate(() => (window as any).__bucket());
        if (!await plot.evaluate(node => !!node.closest('[data-bridge-scene-readout]'))) {
          await captureImmersiveRegion(page, plot, name, report);
          expect(await page.evaluate(() => (window as any).__bucket())).toEqual(before);
          return;
        }
        const viewport = page.viewportSize()!;
        const initial = await plot.evaluate(node => ({ width: node.getBoundingClientRect().width,
          panelWidth: node.closest('[data-bridge-scene-readout]')!.getBoundingClientRect().width,
          stageWidth: node.closest('[data-allo-fs-stage]')!.getBoundingClientRect().width,
          fullscreen: !!document.fullscreenElement }));
        const exit = page.getByRole('button', { name: 'Exit fullscreen 3D bridge (Escape)', exact: true });
        const enter = page.getByRole('button', { name: 'View the 3D bridge fullscreen', exact: true });
        try {
          if (initial.fullscreen) await exit.click();
          await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true);
          const height = await plot.evaluate(node => node.getBoundingClientRect().height);
          await page.setViewportSize({ width: Math.ceil(initial.stageWidth), height: Math.max(viewport.height, 1200, Math.ceil(height) + 350) });
          await enter.click();
          await expect(exit).toBeVisible();
          await plot.evaluate(node => node.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }));
          const box = await plot.evaluate(node => {
            const r = node.getBoundingClientRect(), p = node.closest('[data-bridge-scene-readout]')!.getBoundingClientRect();
            return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width,
              panelTop: p.top, panelBottom: p.bottom, panelWidth: p.width };
          });
          expect(Math.abs(box.width - initial.width), 'capture retains native plot width').toBeLessThanOrEqual(1);
          expect(Math.abs(box.panelWidth - initial.panelWidth), 'capture retains native panel width').toBeLessThanOrEqual(1);
          expect(box.top).toBeGreaterThanOrEqual(box.panelTop + 2);
          expect(box.bottom).toBeLessThanOrEqual(box.panelBottom - 2);
          expect(box.left).toBeGreaterThanOrEqual(0);
          expect(box.right).toBeLessThanOrEqual(page.viewportSize()!.width);
          await plot.screenshot({ path: join(report, name) });
        } finally {
          if (await page.evaluate(() => !!document.fullscreenElement)) await exit.click();
          await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true);
          await page.setViewportSize(viewport);
          if (initial.fullscreen) { await enter.click(); await expect(exit).toBeVisible(); }
        }
        expect(await page.evaluate(() => (window as any).__bucket()), 'capture preserves the complete experiment').toEqual(before);
        expect(page.viewportSize()).toEqual(viewport);
      }
      async function check(scope: Scope, trial: Trial, label: string, time: number, capture = false) {
        await page.evaluate(time => (window as any).__set({ seismicTime: time }), time);
        const frame = lens(scope).locator('[data-force-frame]');
        await expect(frame).toHaveAttribute('data-force-frame', String(time));
        await expect(frame).toHaveAttribute('data-force-trial', trial);
        const before = await page.evaluate(() => (window as any).__bucket()), currentInputs = await flowCurrentInputs(page);
        const selected = response(trial === 'reference' ? savedInputs : currentInputs);
        const paired = scope === 'scene' && before.seismicSceneCompare;
        const other = paired ? response(trial === 'reference' ? currentInputs : savedInputs) : null;
        const rawLimit = Math.max(maximum(selected), other ? maximum(other) : 0), limit = (rawLimit > 0 ? rawLimit : 0.001) * 1.04;
        const point = oracle.bridgeSeismicSample(selected, time), expected = forces(selected, point);
        const actual = await frame.evaluate(node => {
          const plot = node.querySelector('[data-force-plot]')!, scale = node.querySelector('[data-force-scale-caption]')!, help = node.querySelector('[data-force-ruler-help]')!;
          const native = (element: Element) => !element.closest('svg,[aria-hidden="true"]') && !!element.getClientRects().length;
          return { limit: Number(node.getAttribute('data-force-limit')), role: plot.getAttribute('role'), name: plot.getAttribute('aria-label'),
            scale: { text: scale.textContent, native: native(scale) }, help: { text: help.textContent, native: native(help) },
            order: plot.nextElementSibling === scale && scale.nextElementSibling === help,
            axis: [...plot.querySelectorAll('[data-force-axis] > span')].map(span => ({ text: span.textContent,
              x: span.getBoundingClientRect().x + span.getBoundingClientRect().width / 2 })),
            rows: [...plot.querySelectorAll('[data-force-ruler]')].map(row => {
              const id = row.getAttribute('data-force-ruler')!, reading = row.querySelector('[data-force-reading]')!;
              const heading = reading.querySelector('span')!, number = reading.querySelector('strong')!;
              const svg = row.querySelector('[data-force-ruler-svg]') as SVGSVGElement;
              const arrow = svg.querySelector('[data-force-arrow]')!, line = arrow.querySelector(':scope > g > line');
              const origin = arrow.querySelector('circle') as SVGCircleElement, matrix = svg.getScreenCTM()!;
              const r = row.getBoundingClientRect(), h = heading.getBoundingClientRect(), n = number.getBoundingClientRect(), s = svg.getBoundingClientRect();
              return { id, readingId: reading.getAttribute('data-force-reading'), value: Number(reading.getAttribute('data-force-value')),
                label: heading.textContent, text: number.textContent, native: native(reading), svgId: svg.getAttribute('data-force-ruler-svg'),
                arrowId: arrow.getAttribute('data-force-arrow'), arrowValue: Number(arrow.getAttribute('data-force-arrow-value')),
                viewBox: svg.getAttribute('viewBox'), hidden: svg.getAttribute('aria-hidden'), focusable: svg.getAttribute('focusable'),
                matrix: { a: matrix.a, d: matrix.d, e: matrix.e, f: matrix.f }, zero: matrix.e + matrix.a * origin.cx.baseVal.value,
                origin: [origin.cx.baseVal.value, origin.cy.baseVal.value, origin.r.baseVal.value],
                endpoint: line ? Number(line.getAttribute('x2')) : null,
                arrowStart: line ? Number(line.getAttribute('x1')) : null, arrowY: line ? Number(line.getAttribute('y1')) : null,
                arrowHead: arrow.querySelector(':scope > g > path')?.getAttribute('d') ?? null,
                bounds: { left: r.left, right: r.right, bottom: r.bottom, labelLeft: h.left, labelRight: h.right,
                  numberLeft: n.left, numberRight: n.right, readingBottom: Math.max(h.bottom, n.bottom), svgTop: s.top, svgBottom: s.bottom },
                overflow: row.scrollWidth - row.clientWidth };
            }), overflow: node.scrollWidth - node.clientWidth };
        });
        expect(Math.abs(actual.limit - limit)).toBeLessThanOrEqual(limit * 2e-10);
        expect(actual).toMatchObject({ role: 'group', name: 'Force lens', order: true,
          help: { text: 'Each arrow starts at zero. Right is positive; all three rows use the same force scale.', native: true } });
        expect(actual.scale).toEqual({ text: 'Arrow range: ±' + frameEnergyNumber(actual.limit) + ' N/kg · '
          + (paired ? 'fixed for A and B' : 'fixed for this experiment'), native: true });
        expect(actual.axis.map(item => item.text)).toEqual(['−', '0', '+']);
        expect(actual.rows.map(row => row.id)).toEqual(['spring', 'damping', 'net']);
        for (const row of actual.rows) {
          const id = row.id as keyof typeof expected, value = expected[id];
          expect(Math.abs(row.value - value), id + ' follows recorded motion').toBeLessThanOrEqual(limit * 2e-10);
          expect(row.arrowValue).toBe(row.value);
          expect(row).toMatchObject({ readingId: id, svgId: id, arrowId: id,
            label: { spring: 'Spring', damping: 'Damping', net: 'Net force' }[id], text: signed(row.value) + ' N/kg',
            native: true, viewBox: '0 0 240 32', hidden: 'true', focusable: 'false', origin: [120, 16, 3] });
          expect(row.matrix.a).toBeGreaterThan(0);
          expect(row.matrix.a, 'rulers preserve their aspect ratio').toBeCloseTo(row.matrix.d, 6);
          expect(row.zero, 'all rows align their zero').toBeCloseTo(actual.rows[0].zero, 5);
          expect(row.matrix.a, 'all rows use one visual scale').toBeCloseTo(actual.rows[0].matrix.a, 6);
          expect(Math.abs(row.zero - actual.axis[1].x), 'native zero caption aligns with the origins').toBeLessThanOrEqual(1);
          if (Math.abs(value / limit) * 100 > 0.5) {
            const endpoint = 120 + value / limit * 100, direction = value < 0 ? -1 : 1;
            expect(row.arrowStart).toBe(120); expect(row.arrowY).toBe(16);
            expect(row.endpoint!).toBeCloseTo(endpoint, 8);
            const numbers = row.arrowHead!.match(/-?\d+(?:\.\d+)?(?:e[-+]?\d+)?/gi)!.map(Number);
            const wanted = [endpoint - direction * 5, 12, endpoint, 16, endpoint - direction * 5, 20];
            numbers.forEach((number, index) => expect(number).toBeCloseTo(wanted[index], 8));
          } else { expect(row.endpoint).toBeNull(); expect(row.arrowHead).toBeNull(); }
          expect(row.bounds.labelLeft).toBeGreaterThanOrEqual(row.bounds.left);
          expect(row.bounds.labelRight).toBeLessThanOrEqual(row.bounds.right);
          expect(row.bounds.numberLeft).toBeGreaterThanOrEqual(row.bounds.left);
          expect(row.bounds.numberRight).toBeLessThanOrEqual(row.bounds.right);
          expect(row.bounds.svgTop, 'each label sits directly above its own arrow').toBeGreaterThanOrEqual(row.bounds.readingBottom);
          expect(row.bounds.svgBottom).toBeLessThanOrEqual(row.bounds.bottom);
          expect(row.overflow).toBeLessThanOrEqual(1);
        }
        expect(Math.abs(expected.net - point.absoluteAccelerationMps2)).toBeLessThanOrEqual(limit * 2e-10);
        expect(actual.overflow).toBeLessThanOrEqual(1);
        if (capture) await capturePlot(frame, 'force-rulers-' + width + '-' + label + '.png');
        expect(await page.evaluate(() => (window as any).__bucket()), 'inspection preserves every experiment field').toEqual(before);
        records.push({ scope, trial, label, time, expected, limit, actual });
        return { limit, expected, actual };
      }
      const reference = await check('scene', 'reference', 'reference', 7.217, true);
      const beforeClose = await page.evaluate(() => (window as any).__bucket());
      const markup = await lens('scene').locator('[data-force-plot]').innerHTML();
      await lens('scene').locator(':scope > summary').press('Enter');
      await expect(lens('scene')).not.toHaveAttribute('open');
      await expect(lens('scene').locator('[data-force-frame]')).toHaveCount(0);
      await expect.poll(() => page.evaluate(() => (window as any).__bucket())).toEqual({ ...beforeClose, seismicForceLens: false });
      await lens('scene').locator(':scope > summary').press('Space');
      await expect(lens('scene')).toHaveAttribute('open', '');
      await expect.poll(() => page.evaluate(() => (window as any).__bucket())).toEqual(beforeClose);
      expect(await lens('scene').locator('[data-force-plot]').innerHTML()).toBe(markup);
      await page.getByRole('button', { name: 'B · current', exact: true }).click();
      const current = await check('scene', 'current', 'current', 7.217);
      expect(current.limit).toBe(reference.limit); expect(current.expected).not.toEqual(reference.expected);
      expect((await check('scene', 'current', 'later', 12.319)).limit).toBe(current.limit);
      const record = response(await flowCurrentInputs(page));
      const moments = record.samples.filter((point: any) => point.timeS > 2 && point.timeS < 14)
        .map((point: any) => ({ time: point.timeS, ...forces(record, point) }));
      const adding = moments.filter((f: any) => f.spring * f.damping > 0)
        .sort((a: any, b: any) => Math.abs(b.net) - Math.abs(a.net))[0];
      const cancelling = moments.filter((f: any) => f.spring * f.damping < 0
        && Math.min(Math.abs(f.spring), Math.abs(f.damping)) > maximum(record) * 0.01)
        .sort((a: any, b: any) => Math.abs(a.net) / (Math.abs(a.spring) + Math.abs(a.damping))
          - Math.abs(b.net) / (Math.abs(b.spring) + Math.abs(b.damping)))[0];
      expect(adding).toBeTruthy(); expect(cancelling).toBeTruthy();
      const together = await check('scene', 'current', 'adding', adding.time, true);
      expect(Math.abs(together.expected.net)).toBeGreaterThan(Math.max(Math.abs(together.expected.spring), Math.abs(together.expected.damping)));
      const opposed = await check('scene', 'current', 'cancelling', cancelling.time);
      expect(Math.abs(opposed.expected.net)).toBeLessThan(Math.min(Math.abs(opposed.expected.spring), Math.abs(opposed.expected.damping)));
      const zeroTime = await check('scene', 'current', 'zero-time', 0);
      expect(Object.values(zeroTime.expected).every(value => value === 0)).toBe(true);
      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 1e-9 }));
      const tiny = await check('scene', 'current', 'tiny-paired', 7.217);
      expect(tiny.actual.rows.every(row => row.value !== 0 && /e-/.test(row.text!) && row.endpoint === null)).toBe(true);
      await page.evaluate(() => (window as any).__set({ seismicSceneCompare: false }));
      const tinySolo = await check('scene', 'current', 'tiny-unpaired', 7.217);
      expect(tinySolo.limit).toBeLessThan(tiny.limit);
      expect(tinySolo.actual.rows.some(row => row.endpoint !== null)).toBe(true);
      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 0.24, seismicDampingRatio: 0 }));
      expect(Math.abs((await check('scene', 'current', 'undamped', 7.217)).expected.damping)).toBe(0);
      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 0 }));
      const zero = await check('scene', 'current', 'zero-unpaired', 7.217);
      expect(zero.limit).toBe(0.001 * 1.04); expect(zero.actual.rows.every(row => row.value === 0 && row.endpoint === null)).toBe(true);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.evaluate(() => (window as any).__set({ bridgeView: '2d', seismicIntensityG: 0.24, seismicDampingRatio: 0.2,
        seismicSceneCompare: true, seismicSceneTrial: 'reference' }));
      await expect(lens('scene')).toHaveCount(0);
      await check('fallback', 'current', 'fallback', 12.319, true);
      await checkWorkflowHealth(page);
      await writeFile(join(report, 'force-rulers-' + width + '-state.json'), JSON.stringify({ width, records }, null, 2));
    });
  }
  for (const width of [1000, 320]) {
    test('motion pin: shared positions, exact moments and reversible comparison at ' + width + 'px', async ({ page }) => {
      test.setTimeout(360_000);
      const report = process.env.BRIDGE_CAPTURE_REPORT || ENHANCEMENT_REPORT;
      await mkdir(report, { recursive: true });
      const oracle = await loadFrameEnergyOracle();
      await mountWorkflow(page, width, { bridgeView: 'immersive', bridgeObserver: 'bank', seismicEnabled: true,
        seismicIntensityG: 0.12, seismicDampingRatio: 0.05, seismicFrequencyHz: 1.1, seismicArchetype: 'stiff',
        seismicTime: 12.319, seismicIntervalPinS: 7.217, seismicMotionGuide: true, seismicEnergyInterval: false,
        seismicPlaying: false, autoDriving: false, seismicReadoutCollapsed: false, crossSectionMm2: 30000,
        lateralBraceEvery: 1, seismicTrialName: 'Pinned motion reference', seismicObservation: 'Compare positions at two times.',
        seismicSceneNote: 'Keep the riverbank observation.' });
      await page.getByRole('button', { name: 'Save earthquake trial', exact: true }).click();
      const savedInputs = await page.evaluate(() => (window as any).__bucket().seismicTrials[0].inputs);
      await page.getByRole('button', { name: 'From the riverbank', exact: true }).click();
      await page.evaluate(() => (window as any).__set({ seismicArchetype: 'flexible', seismicIntensityG: 0.24,
        seismicSceneCompare: true, seismicSceneSource: 'saved', seismicReferenceIndex: 0, seismicSceneTrial: 'reference' }));
      type Scope = 'scene' | 'fallback';
      type Trial = 'reference' | 'current';
      const records: any[] = [], responses = new Map<string, any>();
      const motion = (scope: Scope) => page.locator('[data-bridge-motion-guide="' + scope + '"]');
      function response(inputs: GuideInputs) {
        const key = JSON.stringify(Object.keys(inputs).sort().map(name => [name, inputs[name]]));
        if (!responses.has(key)) responses.set(key, oracle.bridgeSeismicResponse(inputs));
        return responses.get(key);
      }
      const cm = (value: number) => value === 0 ? '0.00 cm'
        : (value < 0 ? '−' : '+') + frameEnergyNumber(Math.abs(value * 100)) + ' cm';
      async function captureMotionFigure(figure: import('@playwright/test').Locator, name: string) {
        const inScene = await figure.evaluate(node => !!node.closest('[data-bridge-scene-readout]'));
        const before = await page.evaluate(() => (window as any).__bucket());
        if (!inScene) {
          await captureImmersiveRegion(page, figure, name, report);
          expect(await page.evaluate(() => (window as any).__bucket())).toEqual(before);
          return;
        }
        // Check the normal-height panel first, one native explanation at a time.
        // The complete screenshot uses the same width in a taller native view.
        for (const selector of [':scope > figcaption', '[data-motion-pin-caption]',
          '[data-motion-pin-help]', '[data-motion-position-scope]']) {
          const part = figure.locator(selector);
          await part.evaluate(node => node.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }));
          const box = await part.evaluate(node => {
            const r = node.getBoundingClientRect(), p = node.closest('[data-bridge-scene-readout]')!.getBoundingClientRect();
            return { top: r.top, bottom: r.bottom, panelTop: p.top, panelBottom: p.bottom };
          });
          expect(box.top, selector + ' is reachable inside the normal panel').toBeGreaterThanOrEqual(box.panelTop + 2);
          expect(box.bottom, selector + ' is reachable inside the normal panel').toBeLessThanOrEqual(box.panelBottom - 2);
        }
        const viewport = page.viewportSize()!;
        const initial = await figure.evaluate(node => ({ width: node.getBoundingClientRect().width,
          panelWidth: node.closest('[data-bridge-scene-readout]')!.getBoundingClientRect().width,
          stageWidth: node.closest('[data-allo-fs-stage]')!.getBoundingClientRect().width,
          fullscreen: !!document.fullscreenElement }));
        const exit = page.getByRole('button', { name: 'Exit fullscreen 3D bridge (Escape)', exact: true });
        const enter = page.getByRole('button', { name: 'View the 3D bridge fullscreen', exact: true });
        try {
          // Windows Chromium must leave fullscreen before resizing its window.
          if (initial.fullscreen) await exit.click();
          await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true);
          const height = await figure.evaluate(node => node.getBoundingClientRect().height);
          await page.setViewportSize({ width: Math.ceil(initial.stageWidth), height: Math.max(viewport.height, 1200, Math.ceil(height) + 350) });
          await enter.click();
          await expect(exit).toBeVisible();
          await figure.evaluate(node => node.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }));
          const box = await figure.evaluate(node => {
            const r = node.getBoundingClientRect(), p = node.closest('[data-bridge-scene-readout]')!.getBoundingClientRect();
            return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width,
              panelLeft: p.left, panelRight: p.right, panelTop: p.top, panelBottom: p.bottom, panelWidth: p.width };
          });
          expect(Math.abs(box.width - initial.width), 'capture preserves native figure width within viewport rounding').toBeLessThanOrEqual(1);
          expect(Math.abs(box.panelWidth - initial.panelWidth), 'capture preserves the narrow native panel').toBeLessThanOrEqual(1);
          expect(box.top, 'capture includes the title').toBeGreaterThanOrEqual(box.panelTop + 2);
          expect(box.bottom, 'capture includes the final scope statement').toBeLessThanOrEqual(box.panelBottom - 2);
          expect(box.left).toBeGreaterThanOrEqual(box.panelLeft);
          expect(box.right).toBeLessThanOrEqual(box.panelRight);
          expect(box.top).toBeGreaterThanOrEqual(0);
          expect(box.bottom).toBeLessThanOrEqual(page.viewportSize()!.height);
          expect(box.left).toBeGreaterThanOrEqual(0);
          expect(box.right).toBeLessThanOrEqual(page.viewportSize()!.width);
          await figure.screenshot({ path: join(report, name) });
        } finally {
          if (await page.evaluate(() => !!document.fullscreenElement)) await exit.click();
          await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true);
          await page.setViewportSize(viewport);
          if (initial.fullscreen) { await enter.click(); await expect(exit).toBeVisible(); }
        }
        expect(page.viewportSize()).toEqual(viewport);
        expect(await page.evaluate(() => !!document.fullscreenElement)).toBe(initial.fullscreen);
        expect(await page.evaluate(() => (window as any).__bucket()), 'capture preserves the complete experiment state').toEqual(before);
      }
      async function check(scope: Scope, trial: Trial, label: string, pinTime: number, time: number,
        options: { enabled?: boolean; capture?: boolean } = {}) {
        const enabled = options.enabled !== false;
        await page.evaluate(({ pinTime, time, enabled }) => (window as any).__set({ seismicIntervalPinS: pinTime,
          seismicTime: time, seismicEnergyInterval: enabled }), { pinTime, time, enabled });
        const frame = motion(scope).locator('[data-motion-frame]');
        await expect(frame).toHaveAttribute('data-motion-frame', String(time));
        await expect(frame).toHaveAttribute('data-motion-trial', trial);
        const before = await page.evaluate(() => (window as any).__bucket());
        const currentInputs = await flowCurrentInputs(page);
        const selected = response(trial === 'reference' ? savedInputs : currentInputs);
        const other = scope === 'scene' && before.seismicSceneCompare ? response(trial === 'reference' ? currentInputs : savedInputs) : null;
        const maximum = Math.max(selected.peaks.groundM, selected.peaks.absoluteM, other?.peaks.groundM || 0, other?.peaks.absoluteM || 0);
        const range = maximum > 0 ? maximum : 0.001;
        // Sample the recorded response directly; no position helper or DOM value
        // contributes to the expected pin coordinates, scale, or signed readings.
        const pin = oracle.bridgeSeismicSample(selected, pinTime), point = oracle.bridgeSeismicSample(selected, time);
        const current = await checkMotionPositionDiagram(frame);
        expect(Math.abs(current.range - range)).toBeLessThanOrEqual(range * 2e-10);
        const tolerance = Math.max(selected.peaks.groundM, selected.peaks.absoluteM) * 2e-10;
        for (const [id, field] of [['ground', 'groundM'], ['deck', 'absoluteM'], ['relative', 'relativeM']]) {
          if (point[field] === 0) expect(current.readings[id]).toBe(0);
          else expect(Math.abs(current.readings[id] - point[field])).toBeLessThanOrEqual(tolerance);
        }
        const figure = frame.locator('[data-motion-position-diagram]');
        const actual = await frame.evaluate(node => {
          const figure = node.querySelector('[data-motion-position-diagram]')!;
          const svg = figure.querySelector('[data-motion-position-svg]') as SVGSVGElement;
          const matrix = svg.getScreenCTM()!;
          const caption = figure.querySelector('[data-motion-pin-caption]');
          const help = figure.querySelector('[data-motion-pin-help]');
          const native = (element: Element) => !element.closest('svg,[aria-hidden="true"]') && !!element.getClientRects().length;
          return { matrix: { a: matrix.a, d: matrix.d, e: matrix.e, f: matrix.f },
            caption: caption ? { pin: Number(caption.getAttribute('data-motion-pin-time')),
              time: Number(caption.getAttribute('data-motion-inspected-time')), text: caption.textContent,
              native: native(caption), symbolHidden: caption.querySelector('span span')?.getAttribute('aria-hidden') } : null,
            help: help ? { text: help.textContent, native: native(help) } : null,
            pins: [...figure.querySelectorAll('[data-motion-pin-marker]')].map(element => {
              const id = element.getAttribute('data-motion-pin-marker')!, square = element.querySelector('rect') as SVGRectElement;
              const box = element.getBoundingClientRect(), shape = square.getBoundingClientRect(), local = square.getBBox();
              const inspected = figure.querySelector('[data-motion-position-glyph="' + id + '"]')!.getBoundingClientRect();
              return { id, percent: Number(element.getAttribute('data-motion-pin-percent')),
                time: Number(element.getAttribute('data-motion-pin-time')), viewBox: element.getAttribute('viewBox'),
                hidden: element.getAttribute('aria-hidden'), focusable: element.getAttribute('focusable'),
                width: box.width, height: box.height, x: box.x + box.width / 2, y: box.y + box.height / 2,
                currentY: inspected.y + inspected.height / 2, shape: [local.x, local.y, local.width, local.height],
                shapeWidth: shape.width, shapeHeight: shape.height, stroke: getComputedStyle(square).stroke,
                nested: !!element.closest('[data-motion-position-svg]') };
            }),
            readings: [...node.querySelectorAll('[data-motion-pin-reading]')].map(element => ({
              id: element.getAttribute('data-motion-pin-reading'), value: Number(element.getAttribute('data-motion-pin-value-m')),
              text: element.textContent, native: native(element), overflow: element.scrollWidth - element.clientWidth })),
            scientific: !!node.querySelector('[data-motion-scientific-help]'), overflow: node.scrollWidth - node.clientWidth };
        });
        if (enabled) {
          expect(actual.caption).toEqual({ pin: pinTime, time, text: '□ Pin · ' + pinTime.toFixed(3) + ' sInspected · ' + time.toFixed(3) + ' s', native: true, symbolHidden: 'true' });
          expect(actual.help).toEqual({ text: 'White squares mark the pinned positions. Colored shapes show the inspected moment.', native: true });
          expect(actual.pins).toHaveLength(2);
          for (const marker of actual.pins) {
            const value = pin[marker.id === 'deck' ? 'absoluteM' : 'groundM'];
            const percent = 50 + value / range * 40;
            expect(marker).toMatchObject({ time: pinTime, viewBox: '0 0 16 16', hidden: 'true', focusable: 'false',
              width: 16, height: 16, shape: [4, 4, 8, 8], shapeWidth: 8, shapeHeight: 8,
              stroke: 'rgb(248, 250, 252)', nested: false });
            expect(marker.percent).toBeCloseTo(percent, 11);
            expect(Math.abs(marker.x - (actual.matrix.e + actual.matrix.a * percent * 4))).toBeLessThanOrEqual(0.02);
            expect(Math.abs(marker.y - (actual.matrix.f + actual.matrix.d * (marker.id === 'deck' ? 36 : 76)))).toBeLessThanOrEqual(0.02);
            expect(marker.y - marker.currentY, 'pin remains legible when both moments coincide').toBeCloseTo(14, 4);
          }
          expect(actual.readings).toHaveLength(3);
          for (const reading of actual.readings) {
            const value = pin[reading.id === 'ground' ? 'groundM' : reading.id === 'deck' ? 'absoluteM' : 'relativeM'];
            if (value === 0) expect(reading.value).toBe(0);
            else expect(Math.abs(reading.value - value)).toBeLessThanOrEqual(tolerance);
            expect(reading).toMatchObject({ text: 'At pin: ' + cm(reading.value), native: true });
            expect(reading.overflow).toBeLessThanOrEqual(1);
          }
        } else {
          expect(actual.caption).toBeNull(); expect(actual.help).toBeNull();
          expect(actual.pins).toHaveLength(0); expect(actual.readings).toHaveLength(0);
        }
        const tiny = (value: number) => value !== 0 && Math.abs(value * 100) < 0.001;
        expect(actual.scientific).toBe([point.groundM, point.absoluteM, point.relativeM, maximum,
          ...(enabled ? [pin.groundM, pin.absoluteM, pin.relativeM] : [])].some(tiny));
        expect(actual.overflow).toBeLessThanOrEqual(1);
        if (options.capture) await captureMotionFigure(figure, 'motion-pin-' + width + '-' + label + '.png');
        expect(await page.evaluate(() => (window as any).__bucket()), 'inspection preserves every experiment field').toEqual(before);
        records.push({ scope, trial, label, pinTime, time, enabled, range, current, actual });
        return { range, current, pinValues: actual.readings.map(reading => reading.value) };
      }
      const closed = await check('scene', 'reference', 'closed-before', 7.217, 12.319, { enabled: false });
      const diagram = motion('scene').locator('[data-motion-position-diagram]');
      const closedMarkup = await diagram.innerHTML();
      const reference = await check('scene', 'reference', 'reference', 7.217, 12.319, { capture: true });
      expect(reference.current).toEqual(closed.current);
      const interval = page.locator('[data-bridge-energy-interval="scene"]');
      const beforeClose = await page.evaluate(() => (window as any).__bucket());
      await interval.locator(':scope > summary').press('Enter');
      await expect(interval).not.toHaveAttribute('open');
      await expect.poll(() => page.evaluate(() => (window as any).__bucket())).toEqual({ ...beforeClose,
        seismicEnergyInterval: false, seismicPlaying: false, autoDriving: false });
      expect(await diagram.innerHTML(), 'closing the comparison restores the original diagram exactly').toBe(closedMarkup);
      await expect(motion('scene').locator('[data-motion-pin-reading]')).toHaveCount(0);
      await interval.locator(':scope > summary').press('Space');
      await expect(interval).toHaveAttribute('open', '');
      await expect.poll(() => page.evaluate(() => (window as any).__bucket())).toEqual(beforeClose);
      await page.getByRole('button', { name: 'B · current', exact: true }).click();
      const current = await check('scene', 'current', 'current', 7.217, 12.319);
      expect(current.range).toBe(reference.range); expect(current.pinValues).not.toEqual(reference.pinValues);
      const reversed = await check('scene', 'current', 'reversed', 12.319, 7.217);
      expect(reversed.pinValues).toEqual(['ground', 'deck', 'relative'].map(id => current.current.readings[id]));
      await check('scene', 'current', 'same', 7.217, 7.217, { capture: true });
      await check('scene', 'current', 'pin-only-tiny', 1e-7, 0);
      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 1e-9 }));
      await check('scene', 'current', 'tiny-paired', 7.217, 12.319);
      await page.evaluate(() => (window as any).__set({ seismicSceneCompare: false }));
      await check('scene', 'current', 'tiny-unpaired', 7.217, 12.319);
      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 0, seismicSceneCompare: true }));
      const zeroPaired = await check('scene', 'current', 'zero-paired', 7.217, 12.319);
      expect(zeroPaired.pinValues).toEqual([0, 0, 0]);
      await page.evaluate(() => (window as any).__set({ seismicSceneCompare: false }));
      const zero = await check('scene', 'current', 'zero-unpaired', 7.217, 12.319);
      expect(zero.range).toBe(0.001);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.evaluate(() => (window as any).__set({ bridgeView: '2d', seismicIntensityG: 0.24,
        seismicSceneCompare: true, seismicSceneTrial: 'reference' }));
      await expect(motion('scene')).toHaveCount(0);
      await check('fallback', 'current', 'fallback-reversed', 20.123456789, 12.319, { capture: true });
      await check('fallback', 'current', 'fallback-closed', 20.123456789, 12.319, { enabled: false });
      await checkWorkflowHealth(page);
      await writeFile(join(report, 'motion-pin-' + width + '-state.json'), JSON.stringify({ width, records }, null, 2));
    });
  }
  for (const width of [1000, 320]) {
    test('moment precision: tiny milestones, saved trials and exact-time scope at ' + width + 'px', async ({ page }) => {
      test.setTimeout(600_000);
      const oracle = await loadFrameEnergyOracle();
      await mountWorkflow(page, width, { bridgeView: 'immersive', bridgeObserver: 'bank', seismicEnabled: true,
        seismicIntensityG: 0.000001, seismicDampingRatio: 0.05, seismicFrequencyHz: 1.1, seismicArchetype: 'balanced',
        seismicTime: 7.217, seismicPlaying: false, autoDriving: false, seismicReadoutCollapsed: false,
        crossSectionMm2: 30000, lateralBraceEvery: 1, seismicTrialName: 'Tiny moment reference',
        seismicObservation: 'Compare the exact moments.', seismicSceneNote: 'Keep the explanation.' });
      const select = page.getByRole('combobox', { name: 'Scene key moments', exact: true });
      const insight = page.locator('[data-bridge-moment-insight]');
      const tinyInputs = await flowCurrentInputs(page);
      const tiny: Record<string, any> = {};
      const before = await page.evaluate(() => (window as any).__gl());
      for (const id of ['motion', 'acceleration', 'free', 'end'] as SceneMomentId[]) {
        await select.selectOption(id);
        tiny[id] = await checkMomentPrecision(page, oracle, tinyInputs, id);
        expect(tiny[id].scientific, id + ' exposes its tiny nonzero value').toBe(true);
        await checkMomentPrecisionReachability(insight);
        if (id === 'motion' || id === 'end') {
          await captureMomentPrecision(page, insight, 'moment-precision-' + width + '-tiny-' + id + '.png');
          expect(await checkMomentPrecision(page, oracle, tinyInputs, id)).toEqual(tiny[id]);
        }
      }
      expect(tiny.end.value).toBeLessThan(tiny.free.value);

      await page.getByRole('button', { name: 'Save earthquake trial', exact: true }).click();
      const saved = await page.evaluate(() => (window as any).__bucket().seismicTrials[0]);
      expect(saved.inputs).toMatchObject(tinyInputs);
      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 0.12, seismicDampingRatio: 0.2,
        seismicSceneCompare: true, seismicSceneSource: 'saved', seismicSceneTrial: 'reference' }));
      const currentInputs = await flowCurrentInputs(page);
      const savedEnd = await checkMomentPrecision(page, oracle, saved.inputs, 'end', 'reference');
      expect(savedEnd.value).toBe(tiny.end.value);
      await page.getByRole('button', { name: 'B · current', exact: true }).click();
      const normalEnd = await checkMomentPrecision(page, oracle, currentInputs, 'end');
      expect(normalEnd.time, 'switching trials keeps the shared observation clock').toBe(savedEnd.time);
      expect(normalEnd.value).not.toBe(savedEnd.value);

      await page.getByRole('button', { name: 'A · reference', exact: true }).click();
      await select.selectOption('motion');
      const savedMotion = await checkMomentPrecision(page, oracle, saved.inputs, 'motion', 'reference');
      expect(savedMotion.value).toBe(tiny.motion.value);
      await page.getByRole('button', { name: 'B · current', exact: true }).click();
      expect(await page.evaluate(() => (window as any).__bucket().seismicTime)).toBe(savedMotion.time);
      const normalMotionExpected = momentPrecisionExpected(oracle, currentInputs, 'motion');
      await expect(select.locator('option[value="motion"]')).toHaveAttribute('data-moment-time', String(normalMotionExpected.time));
      await select.selectOption('motion');
      const normalMotion = await checkMomentPrecision(page, oracle, currentInputs, 'motion');
      expect(normalMotion.scientific).toBe(false);
      expect(normalMotion.time).not.toBe(savedMotion.time);
      await select.selectOption('acceleration');
      const normalAcceleration = await checkMomentPrecision(page, oracle, currentInputs, 'acceleration');
      expect(normalAcceleration.scientific).toBe(false);
      await captureMomentPrecision(page, insight, 'moment-precision-' + width + '-normal-acceleration.png');

      await page.emulateMedia({ reducedMotion: 'reduce' });
      await expect(page.getByRole('button', { name: 'Replay scene', exact: true })).toBeDisabled();
      expect(await checkMomentPrecision(page, oracle, currentInputs, 'acceleration')).toEqual(normalAcceleration);
      await page.getByRole('button', { name: 'A · reference', exact: true }).click();
      await select.selectOption('free');
      const savedFree = await checkMomentPrecision(page, oracle, saved.inputs, 'free', 'reference');
      expect(savedFree.value).toBe(tiny.free.value);
      await page.getByRole('button', { name: 'B · current', exact: true }).click();
      const normalFree = await checkMomentPrecision(page, oracle, currentInputs, 'free');
      expect(normalFree.time).toBe(savedFree.time);
      expect(normalFree.value).not.toBe(savedFree.value);

      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 0, seismicSceneCompare: false,
        seismicSceneTrial: 'current', seismicTime: 7.217 }));
      const zeroInputs = await flowCurrentInputs(page);
      await expect(select.locator('option[value="motion"]')).toBeDisabled();
      await expect(select.locator('option[value="acceleration"]')).toBeDisabled();
      const zeros: Record<string, any> = {};
      for (const id of ['start', 'free', 'end'] as SceneMomentId[]) {
        await select.selectOption(id);
        zeros[id] = await checkMomentPrecision(page, oracle, zeroInputs, id);
        expect(zeros[id].value).toBe(0);
        expect(zeros[id].text).toBe('0.000 J/kg');
        expect(zeros[id].scientific).toBe(false);
      }

      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 0.000001, seismicDampingRatio: 0.05 }));
      await select.selectOption('motion');
      expect(await checkMomentPrecision(page, oracle, tinyInputs, 'motion')).toEqual(tiny.motion);
      const offPeak = tiny.motion.time + 0.001;
      await page.evaluate(time => (window as any).__set({ seismicTime: time }), offPeak);
      await expect(select).toHaveValue('');
      await expect(select).not.toHaveAttribute('aria-describedby');
      await expect(insight).toHaveCount(0);
      expect(await page.evaluate(() => (window as any).__bucket())).toMatchObject({ seismicTime: offPeak,
        seismicPlaying: false, autoDriving: false, seismicObservation: 'Compare the exact moments.',
        seismicSceneNote: 'Keep the explanation.' });
      expect(await page.evaluate(() => (window as any).__bucket().seismicTrials[0])).toEqual(saved);
      expect(await page.evaluate(() => (window as any).__gl().sceneBuilds)).toBe(before.sceneBuilds);
      await writeFile(join(process.env.BRIDGE_CAPTURE_REPORT || ENHANCEMENT_REPORT, 'moment-precision-' + width + '-state.json'),
        JSON.stringify({ width, inputs: { tiny: tinyInputs, saved: saved.inputs, current: currentInputs, zero: zeroInputs },
          tiny, savedMotion, savedFree, savedEnd, normalMotion, normalAcceleration, normalFree, normalEnd, zeros,
          offPeakTimeS: offPeak, savedTrial: saved }, null, 2));
      await checkWorkflowHealth(page);
    });
  }


  for (const width of [1000, 320]) {
    test('settling route: selected trial energy, native focus and boundary scope at ' + width + 'px', async ({ page }) => {
      test.setTimeout(360_000);
      const oracle = await loadFrameEnergyOracle();
      const report = process.env.BRIDGE_CAPTURE_REPORT || ENHANCEMENT_REPORT;
      await mkdir(report, { recursive: true });
      await mountWorkflow(page, width, { bridgeView: 'immersive', bridgeObserver: 'bank',
        bridgeBankYaw: 12, bridgeBankPitch: -5, seismicEnabled: true,
        seismicIntensityG: 0.000001, seismicDampingRatio: 0.05, seismicFrequencyHz: 1.1,
        seismicArchetype: 'balanced', seismicTime: 7.217, seismicIntervalPinS: 7.217,
        seismicPlaying: false, autoDriving: false, seismicReadoutCollapsed: false,
        seismicEnergyInterval: false, crossSectionMm2: 30000, lateralBraceEvery: 1,
        seismicTrialName: 'Tiny settling reference', seismicObservation: 'Keep the interval explanation.',
        seismicSceneNote: 'Keep the riverbank observation.', seismicPrediction: 'Follow stored energy.' });
      // Save A through the product so the selected tiny response has its own inputs.
      await page.getByRole('button', { name: 'Save earthquake trial', exact: true }).click();
      const saved = await page.evaluate(() => (window as any).__bucket().seismicTrials[0]);
      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 0.12, seismicDampingRatio: 0.2,
        seismicSceneCompare: true, seismicSceneSource: 'saved', seismicSceneTrial: 'reference' }));
      const currentInputs = await flowCurrentInputs(page);
      await page.getByRole('button', { name: 'From the riverbank', exact: true }).click();
      const stage = page.locator('[data-allo-fs-stage]');
      await stage.scrollIntoViewIfNeeded();
      await page.getByRole('button', { name: 'View the 3D bridge fullscreen', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Exit fullscreen 3D bridge (Escape)', exact: true })).toBeVisible();
      const panel = page.locator('[data-bridge-scene-readout]');
      const select = page.getByRole('combobox', { name: 'Scene key moments', exact: true });
      const route = page.locator('button[data-moment-energy-route="settling"]');
      const interval = page.locator('[data-bridge-energy-interval="scene"]');
      const summary = interval.locator(':scope > summary');
      const state: Record<string, any> = { width, inputs: { reference: saved.inputs, current: currentInputs } };
      const retained = { bridgeView: 'immersive', bridgeObserver: 'bank', bridgeBankYaw: 12, bridgeBankPitch: -5,
        seismicObservation: 'Keep the interval explanation.', seismicSceneNote: 'Keep the riverbank observation.',
        seismicPrediction: 'Follow stored energy.', seismicPlaying: false, autoDriving: false };

      async function checkDestination(inputs: GuideInputs, trial: 'reference' | 'current') {
        await expect(interval).toHaveAttribute('open', '');
        await expect(summary).toBeFocused();
        const bounds = await summary.evaluate(node => {
          const box = node.getBoundingClientRect(), parent = node.closest('[data-bridge-scene-readout]')!.getBoundingClientRect();
          return { top: box.top, bottom: box.bottom, panelTop: parent.top, panelBottom: parent.bottom };
        });
        expect(bounds.top, 'the route reveals its focused destination in the native panel').toBeGreaterThanOrEqual(bounds.panelTop);
        expect(bounds.bottom).toBeLessThanOrEqual(bounds.panelBottom);
        await expect(interval.locator('[data-interval-window]')).toHaveAttribute('data-interval-start', '16');
        await expect(interval.locator('[data-interval-window]')).toHaveAttribute('data-interval-end', '24');
        await expect(interval.locator('[data-interval-frame]')).toHaveAttribute('data-interval-trial', trial);
        await expect(interval.locator('[data-energy-question]')).toHaveAttribute('data-energy-question', 'settling');
        expect(await page.evaluate(() => (window as any).__bucket())).toMatchObject({ ...retained,
          seismicTime: 24, seismicIntervalPinS: 16, seismicEnergyInterval: true, seismicSceneTrial: trial });
        const response = oracle.bridgeSeismicResponse(inputs);
        const expected = oracle.bridgeSeismicEnergyInterval(response, response.shakingDurationS, response.durationS);
        expect([response.shakingDurationS, response.durationS]).toEqual([16, 24]);
        const expectedTerms: Record<string, number> = { input: expected.inputJPerKg, damping: expected.dissipatedJPerKg,
          kinetic: expected.kineticChangeJPerKg, elastic: expected.elasticChangeJPerKg, stored: expected.storedChangeJPerKg };
        const terms = await interval.locator('[data-interval-term]').evaluateAll(nodes => Object.fromEntries(nodes.map(node =>
          [node.getAttribute('data-interval-term')!, Number(node.getAttribute('data-interval-value'))])));
        const parts = await interval.locator('[data-budget-part]').evaluateAll(nodes => Object.fromEntries(nodes.map(node =>
          [node.getAttribute('data-budget-part')!, Number(node.getAttribute('data-budget-value'))])));
        const expectedParts: Record<string, number> = { initial: expected.earlier.storedJPerKg,
          remaining: expected.later.storedJPerKg, damping: expected.dissipatedJPerKg, added: 0, returned: 0 };
        // Use this trial's physical energy scale, with no absolute floor that
        // could silently accept zero in place of a tiny nonzero reading.
        const tolerance = Math.max(expected.earlier.storedJPerKg, expected.later.storedJPerKg, expected.dissipatedJPerKg) * 2e-9;
        for (const [kind, actual, wanted] of [['terms', terms, expectedTerms], ['budget', parts, expectedParts]] as const) {
          expect(Object.keys(actual).sort()).toEqual(Object.keys(wanted).sort());
          for (const [name, value] of Object.entries(wanted)) {
            if (value === 0) expect(actual[name], kind + ' ' + name + ' is exactly zero').toBe(0);
            else expect(Math.abs(actual[name] - value), kind + ' ' + name + ' matches the independent response').toBeLessThanOrEqual(tolerance);
          }
        }
        return { trial, start: 16, end: 24, terms, parts, expectedTerms, expectedParts,
          explanation: await interval.locator('[data-interval-insight]').textContent(), focusBounds: bounds };
      }

      await expect(route).toHaveCount(0);
      await select.selectOption('start');
      await expect(route).toHaveCount(0);
      await select.selectOption('free');
      await expect(page.locator('[data-bridge-moment-insight="free"]')).toHaveAttribute('data-moment-trial', 'reference');
      await expect(panel.locator('[data-scene-inputs]')).toContainText('1.00e-6 g');
      await expect(route).toHaveText('Follow energy after shaking16–24 s');
      await expect(route).toHaveAttribute('aria-controls', 'bridge-scene-energy-interval');
      const entry = await route.evaluate(node => {
        const insight = node.closest('[data-bridge-moment-insight]')!;
        return { tag: node.tagName, type: (node as HTMLButtonElement).type, height: node.getBoundingClientRect().height,
          overflow: node.scrollWidth - node.clientWidth,
          followsPhase: !!insight.previousElementSibling?.querySelector('[data-bridge-scene-phase]'),
          reading: insight.querySelector('[data-moment-reading]')?.textContent };
      });
      expect(entry).toMatchObject({ tag: 'BUTTON', type: 'button', followsPhase: true });
      expect(entry.height).toBeGreaterThanOrEqual(44);
      expect(entry.overflow).toBeLessThanOrEqual(1);
      expect(entry.reading).toMatch(/e-\d+ J\/kg/);
      await panel.evaluate(node => { node.scrollTop = 0; });
      await route.scrollIntoViewIfNeeded();
      await stage.screenshot({ path: join(report, 'settling-route-' + width + '-entry.png') });
      const cameraBefore = await page.evaluate(() => {
        const gl = (window as any).__gl();
        return { mode: gl.cameraMode, position: gl.cameraPosition, direction: gl.cameraDirection, builds: gl.sceneBuilds };
      });
      await route.click();
      state.tinyA = await checkDestination(saved.inputs, 'reference');
      expect(state.tinyA.parts.initial).toBeGreaterThan(0);
      expect(state.tinyA.parts.remaining).toBeGreaterThan(0);
      expect(state.tinyA.parts.remaining).toBeLessThan(state.tinyA.parts.initial);
      expect(state.tinyA.explanation).toContain('The decrease in stored energy becomes damping loss.');
      await stage.screenshot({ path: join(report, 'settling-route-' + width + '-destination.png') });
      await interval.locator('[data-interval-bars]').evaluate(node => node.scrollIntoView({ block: 'start', behavior: 'instant' }));
      await stage.screenshot({ path: join(report, 'settling-route-' + width + '-tiny-energy.png') });
      expect(await page.evaluate(() => {
        const gl = (window as any).__gl();
        return { mode: gl.cameraMode, position: gl.cameraPosition, direction: gl.cameraDirection, builds: gl.sceneBuilds };
      }), 'following energy preserves the riverbank viewpoint and scene').toEqual(cameraBefore);

      const b = page.getByRole('button', { name: 'B · current', exact: true });
      await b.focus();
      await b.press('Enter');
      await expect(b, 'later trial toggles keep their own focus').toBeFocused();
      await expect(panel.locator('[data-scene-inputs]')).toContainText('0.12 g');
      await select.selectOption('end');
      await route.focus();
      await route.press('Enter');
      state.ordinaryB = await checkDestination(currentInputs, 'current');
      expect(state.ordinaryB.parts.initial).toBeGreaterThan(state.tinyA.parts.initial * 1e6);
      expect([state.ordinaryB.start, state.ordinaryB.end]).toEqual([state.tinyA.start, state.tinyA.end]);
      const inspected = interval.getByRole('spinbutton', { name: 'Inspected time (s)', exact: true });
      await inspected.fill('20.123');
      await expect(inspected, 'later scrubbing does not repeat the route focus handoff').toBeFocused();
      await expect(interval.locator('[data-interval-window]')).toHaveAttribute('data-interval-end', '20.123');
      await expect(route).toHaveCount(0);
      for (const time of [16.001, 23.999]) {
        await page.evaluate(value => (window as any).__set({ seismicTime: value }), time);
        await expect(route).toHaveCount(0);
        await expect(inspected).toBeFocused();
      }

      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 0, seismicDampingRatio: 0.05,
        seismicTime: 16, seismicEnergyInterval: false }));
      await expect(page.locator('[data-bridge-moment-insight="free"]')).toContainText('No ground motion was applied');
      await route.click();
      state.zero = await checkDestination(await flowCurrentInputs(page), 'current');
      expect(Object.values(state.zero.terms).every(value => value === 0)).toBe(true);
      expect(state.zero.explanation).toContain('No shaking was applied, so this interval has no energy transfer.');

      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 0.12, seismicDampingRatio: 0,
        seismicTime: 24, seismicEnergyInterval: false }));
      await route.focus();
      await route.press('Enter');
      state.undamped = await checkDestination(await flowCurrentInputs(page), 'current');
      expect(state.undamped.terms.input).toBe(0);
      expect(state.undamped.terms.damping).toBe(0);
      expect(state.undamped.explanation).toContain('Kinetic and elastic energy exchange while stored energy stays constant.');
      expect(await page.evaluate(() => (window as any).__bucket())).toMatchObject(retained);
      expect(await page.evaluate(() => (window as any).__bucket().seismicTrials[0])).toEqual(saved);
      state.entry = entry;
      state.retained = retained;
      state.camera = cameraBefore;
      await writeFile(join(report, 'settling-route-' + width + '-state.json'), JSON.stringify(state, null, 2));
      await page.getByRole('button', { name: 'Exit fullscreen 3D bridge (Escape)', exact: true }).click();
      await checkWorkflowHealth(page);
    });
  }

  for (const width of [1000, 320]) {
    test('interval scale: tiny amounts, shared comparisons and true zero at ' + width + 'px', async ({ page }) => {
      test.setTimeout(600_000);
      const oracle = await loadFrameEnergyOracle();
      const report = process.env.BRIDGE_CAPTURE_REPORT || ENHANCEMENT_REPORT;
      await mkdir(report, { recursive: true });
      await mountWorkflow(page, width, { bridgeView: 'immersive', bridgeObserver: 'bank', seismicEnabled: true,
        seismicIntensityG: 0.000001, seismicDampingRatio: 0.05, seismicFrequencyHz: 1.1, seismicArchetype: 'balanced',
        seismicTime: 24, seismicIntervalPinS: 16, seismicEnergyInterval: true, seismicReadoutCollapsed: false,
        seismicPlaying: false, autoDriving: false, crossSectionMm2: 30000, lateralBraceEvery: 1,
        seismicTrialName: 'Tiny interval reference', seismicObservation: 'Compare energy at the same scale.' });
      await page.getByRole('button', { name: 'Save earthquake trial', exact: true }).click();
      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 0.12, seismicTrialName: 'Ordinary interval reference' }));
      await page.getByRole('button', { name: 'Save earthquake trial', exact: true }).click();
      const saved = await page.evaluate(() => (window as any).__bucket().seismicTrials);
      expect(saved).toHaveLength(2);
      const tinyInputs = saved[0].inputs, ordinaryInputs = saved[1].inputs;
      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 0.000001, seismicSceneCompare: false,
        seismicSceneSource: 'saved', seismicReferenceIndex: 0, seismicSceneTrial: 'current' }));
      const stage = page.locator('[data-allo-fs-stage]');
      await stage.scrollIntoViewIfNeeded();
      await page.getByRole('button', { name: 'View the 3D bridge fullscreen', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Exit fullscreen 3D bridge (Escape)', exact: true })).toBeVisible();
      const interval = page.locator('[data-bridge-energy-interval="scene"]');
      const frame = interval.locator('[data-interval-frame]');
      const budget = interval.locator('[data-interval-budget]');
      const records = new Map<string, any>();
      const state: Record<string, any> = { width, inputs: { tiny: tinyInputs, ordinary: ordinaryInputs } };
      function response(inputs: GuideInputs) {
        const key = JSON.stringify(Object.keys(inputs).sort().map(name => [name, inputs[name]]));
        if (!records.has(key)) records.set(key, oracle.bridgeSeismicResponse(inputs));
        return records.get(key);
      }
      function relative(actual: number, expected: number, label: string, fraction = 2e-9) {
        if (expected === 0) expect(actual, label + ' is exactly zero').toBe(0);
        else expect(Math.abs(actual - expected), label).toBeLessThanOrEqual(Math.abs(expected) * fraction);
      }
      function signed(value: number) {
        return (value > 0 ? '+' : value < 0 ? '\u2212' : '') + frameEnergyNumber(Math.abs(value));
      }
      async function check(inputs: GuideInputs, trial: 'reference' | 'current', paired?: GuideInputs,
        pin = 16, inspected = 24) {
        const selected = response(inputs), other = paired ? response(paired) : null;
        const wanted = oracle.bridgeSeismicEnergyInterval(selected, pin, inspected);
        const otherInterval = other ? oracle.bridgeSeismicEnergyInterval(other, pin, inspected) : null;
        const eventMaximum = Math.max(selected.peaks.storedJPerKg, other?.peaks.storedJPerKg || 0);
        const eventScale = eventMaximum > 0 ? eventMaximum : 1;
        function amounts(record: any) {
          const initial = record.earlier.storedJPerKg, remaining = record.later.storedJPerKg;
          const added = Math.max(0, record.inputJPerKg), returned = Math.max(0, -record.inputJPerKg);
          const damping = record.dissipatedJPerKg;
          return { initial, remaining, added, returned, damping,
            available: initial + added, accounted: remaining + damping + returned };
        }
        const wantedBudget = amounts(wanted), otherBudget = otherInterval ? amounts(otherInterval) : null;
        const budgetMaximum = Math.max(wantedBudget.available, wantedBudget.accounted,
          otherBudget?.available || 0, otherBudget?.accounted || 0);
        const budgetScale = budgetMaximum > 0 ? budgetMaximum * 1.02 : 1;
        await expect(frame).toHaveAttribute('data-interval-trial', trial);
        await expect(frame).toHaveAttribute('data-interval-frame', String(inspected));
        await expect(frame).toHaveAttribute('data-interval-pin', String(pin));
        if (eventMaximum === 0) await expect(frame).toHaveAttribute('data-interval-scale', '1');
        else await expect.poll(async () => Math.abs(Number(await frame.getAttribute('data-interval-scale')) - eventScale) / eventScale,
          { message: 'event scale agrees across the VM and browser runtimes' }).toBeLessThanOrEqual(2e-9);
        if (budgetMaximum === 0) await expect(budget).toHaveAttribute('data-budget-scale', '1');
        else await expect.poll(async () => Math.abs(Number(await budget.getAttribute('data-budget-scale')) - budgetScale) / budgetScale,
          { message: 'budget scale agrees across the VM and browser runtimes' }).toBeLessThanOrEqual(2e-9);
        const expectedWidths: { endpoint: Record<string, number>; budget: Record<string, number> } = { endpoint: {}, budget: {} };
        for (const [id, point] of [['earlier', wanted.earlier], ['later', wanted.later]] as const) {
          expectedWidths.endpoint[id + '-kinetic'] = point.kineticJPerKg / eventScale * 100;
          expectedWidths.endpoint[id + '-elastic'] = point.strainJPerKg / eventScale * 100;
        }
        for (const id of ['initial', 'remaining', 'added', 'returned', 'damping'] as const)
          expectedWidths.budget[id] = wantedBudget[id] / budgetScale * 100;
        const evidence = await interval.evaluate((node, expectedWidths) => {
          // Compare percentages after the browser's CSS serialization; physical
          // values and scales retain the independent relative-error checks.
          const cssWidths = (values: Record<string, number>) => Object.fromEntries(Object.entries(values).map(([id, value]) => {
            const probe = document.createElement('span');
            probe.style.width = value + '%';
            return [id, parseFloat(probe.style.width)];
          }));
          const text = (selector: string) => node.querySelector(selector)?.textContent || '';
          const parts = (selector: string, id: string, value: string) => Object.fromEntries(
            [...node.querySelectorAll<HTMLElement>(selector)].map(part => [part.getAttribute(id)!, {
              value: Number(part.getAttribute(value)), width: parseFloat(part.style.width),
              pixels: part.getBoundingClientRect().width }]));
          return { expectedCssWidths: { endpoint: cssWidths(expectedWidths.endpoint), budget: cssWidths(expectedWidths.budget) },
            eventScale: Number(node.querySelector('[data-interval-frame]')!.getAttribute('data-interval-scale')),
            budgetScale: Number(node.querySelector('[data-interval-budget]')!.getAttribute('data-budget-scale')),
            endpoint: ['earlier', 'later'].map(id => ({ id,
              total: text('[data-interval-energy-frame="' + id + '"] > div:first-child strong'),
              parts: text('[data-interval-energy-frame="' + id + '"] > div:last-child') })),
            endpointParts: parts('[data-interval-part]', 'data-interval-part', 'data-interval-value'),
            budgetParts: parts('[data-budget-part]', 'data-budget-part', 'data-budget-value'),
            totals: [...node.querySelectorAll('[data-budget-bar]')].map(bar => bar.previousElementSibling?.querySelector('strong')?.textContent || ''),
            legends: Object.fromEntries([...node.querySelectorAll('[data-budget-legend]')].map(part => [part.getAttribute('data-budget-legend')!, part.textContent || ''])),
            terms: Object.fromEntries([...node.querySelectorAll('[data-interval-term]')].map(term => [term.getAttribute('data-interval-term')!, {
              value: Number(term.getAttribute('data-interval-value')), text: term.textContent || '' }])),
            eventCaption: text('[data-interval-scale-label]'), budgetCaption: text('[data-budget-scale-label]'),
            scientificHelp: [...node.querySelectorAll('[data-interval-scientific-help]')].map(help => help.textContent || ''),
            overflow: node.scrollWidth - node.clientWidth };
        }, expectedWidths);
        for (const row of evidence.endpoint) {
          const point = row.id === 'earlier' ? wanted.earlier : wanted.later;
          expect(row.total).toBe(frameEnergyNumber(point.storedJPerKg) + ' J/kg');
          expect(row.parts).toBe('Kinetic: ' + frameEnergyNumber(point.kineticJPerKg) + ' · Elastic: ' + frameEnergyNumber(point.strainJPerKg) + ' J/kg');
          for (const [id, value] of [['kinetic', point.kineticJPerKg], ['elastic', point.strainJPerKg]] as const) {
            const part = evidence.endpointParts[row.id + '-' + id];
            relative(part.value, value, row.id + ' ' + id);
            const cssExpected = evidence.expectedCssWidths.endpoint[row.id + '-' + id];
            if (value === 0) expect(cssExpected).toBe(0); else expect(cssExpected).toBeGreaterThan(0);
            expect(part.width, row.id + ' ' + id + ' proportional CSS width').toBe(cssExpected);
          }
        }
        for (const id of ['initial', 'remaining', 'added', 'returned', 'damping'] as const) {
          relative(evidence.budgetParts[id].value, wantedBudget[id], id + ' budget amount');
          const cssExpected = evidence.expectedCssWidths.budget[id];
          if (wantedBudget[id] === 0) expect(cssExpected).toBe(0); else expect(cssExpected).toBeGreaterThan(0);
          expect(evidence.budgetParts[id].width, id + ' proportional CSS width').toBe(cssExpected);
          expect(evidence.legends[id]).toContain(': ' + frameEnergyNumber(wantedBudget[id]) + ' J/kg');
        }
        expect(evidence.totals).toEqual([wantedBudget.available, wantedBudget.accounted].map(value => frameEnergyNumber(value) + ' J/kg'));
        const expectedTerms = { input: wanted.inputJPerKg, damping: wanted.dissipatedJPerKg,
          kinetic: wanted.kineticChangeJPerKg, elastic: wanted.elasticChangeJPerKg, stored: wanted.storedChangeJPerKg };
        for (const [id, value] of Object.entries(expectedTerms)) {
          relative(evidence.terms[id].value, value, id + ' signed amount');
          expect(evidence.terms[id].text).toContain(signed(value) + ' J/kg');
        }
        expect(evidence.eventCaption).toBe(eventMaximum > 0 ? 'Full bar: ' + frameEnergyNumber(eventScale) + ' J/kg · fixed event scale'
          : 'No stored energy recorded; bars are empty.');
        expect(evidence.budgetCaption).toBe(budgetMaximum > 0 ? 'Full bar: ' + frameEnergyNumber(budgetScale) + ' J/kg · interval scale'
          : 'No energy in this interval; bars are empty.');
        expect(evidence.overflow).toBeLessThanOrEqual(1);
        return evidence;
      }
      async function capture(selector: string, suffix: string) {
        await interval.locator(selector).evaluate(node => node.scrollIntoView({ block: 'start', behavior: 'instant' }));
        await stage.screenshot({ path: join(report, 'interval-scale-' + width + '-' + suffix + '.png') });
      }
      state.tiny = await check(tinyInputs, 'current');
      expect(state.tiny.eventScale).toBeGreaterThan(0);
      expect(state.tiny.eventScale).toBeLessThan(0.001);
      expect(state.tiny.budgetScale).toBeLessThan(0.001);
      expect(Math.max(...Object.values(state.tiny.endpointParts).map((part: any) => part.pixels))).toBeGreaterThan(1);
      expect(state.tiny.budgetParts.initial.width).toBeGreaterThan(90);
      expect(state.tiny.scientificHelp).toHaveLength(1);
      expect(state.tiny.scientificHelp[0]).toContain('Scientific notation');
      await capture('[data-interval-bars]', 'tiny-endpoints');
      await capture('[data-interval-budget]', 'tiny-budget');
      await interval.getByRole('button', { name: 'Swap moments', exact: true }).click();
      state.reversed = await check(tinyInputs, 'current', undefined, 24, 16);
      expect(state.reversed).toEqual(state.tiny);
      await interval.getByRole('button', { name: 'Swap moments', exact: true }).click();

      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 0.000002,
        seismicSceneCompare: true, seismicSceneTrial: 'current', seismicReferenceIndex: 0 }));
      const doubleInputs = await flowCurrentInputs(page);
      state.doubleB = await check(doubleInputs, 'current', tinyInputs);
      await page.getByRole('button', { name: 'A · reference', exact: true }).click();
      state.tinyA = await check(tinyInputs, 'reference', doubleInputs);
      expect(state.tinyA.eventScale).toBe(state.doubleB.eventScale);
      expect(state.tinyA.budgetScale).toBe(state.doubleB.budgetScale);
      relative(state.doubleB.endpointParts['earlier-kinetic'].value, state.tinyA.endpointParts['earlier-kinetic'].value * 4,
        'doubling input gives four times the energy');
      await page.getByRole('button', { name: 'B · current', exact: true }).click();
      expect(await check(doubleInputs, 'current', tinyInputs)).toEqual(state.doubleB);

      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 0.000001, seismicReferenceIndex: 1 }));
      state.tinyWithOrdinary = await check(tinyInputs, 'current', ordinaryInputs);
      expect(state.tinyWithOrdinary.eventScale).toBeGreaterThan(state.tiny.eventScale * 1e6);
      expect(state.tinyWithOrdinary.budgetScale).toBeGreaterThan(state.tiny.budgetScale * 1e6);
      await page.getByRole('button', { name: 'A · reference', exact: true }).click();
      state.ordinaryA = await check(ordinaryInputs, 'reference', tinyInputs);
      expect(state.ordinaryA.eventScale).toBe(state.tinyWithOrdinary.eventScale);
      expect(state.ordinaryA.budgetScale).toBe(state.tinyWithOrdinary.budgetScale);
      await page.getByRole('button', { name: 'B · current', exact: true }).click();
      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 0 }));
      const zeroInputs = await flowCurrentInputs(page);
      state.zeroWithOrdinary = await check(zeroInputs, 'current', ordinaryInputs);
      expect(state.zeroWithOrdinary.eventScale).toBe(state.ordinaryA.eventScale);
      expect(state.zeroWithOrdinary.budgetScale).toBe(state.ordinaryA.budgetScale);
      expect(Object.values(state.zeroWithOrdinary.endpointParts).every((part: any) => part.value === 0 && part.width === 0)).toBe(true);
      await page.evaluate(() => (window as any).__set({ seismicSceneCompare: false }));
      state.zero = await check(zeroInputs, 'current');
      expect(state.zero.eventScale).toBe(1);
      expect(state.zero.budgetScale).toBe(1);
      expect(state.zero.scientificHelp).toHaveLength(0);
      if (width === 320) { await capture('[data-interval-bars]', 'zero-endpoints'); await capture('[data-interval-budget]', 'zero-budget'); }
      expect(await page.evaluate(() => (window as any).__bucket())).toMatchObject({ seismicPlaying: false, autoDriving: false,
        bridgeObserver: 'bank', seismicObservation: 'Compare energy at the same scale.' });
      expect(await page.evaluate(() => (window as any).__bucket().seismicTrials)).toEqual(saved);
      state.inputs.double = doubleInputs;
      state.inputs.zero = zeroInputs;
      await writeFile(join(report, 'interval-scale-' + width + '-state.json'), JSON.stringify(state, null, 2));
      await page.getByRole('button', { name: 'Exit fullscreen 3D bridge (Escape)', exact: true }).click();
      await checkWorkflowHealth(page);
    });
  }

  test('key moments: zero-input boundaries and precise manual time remain usable', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await mountWorkflow(page, 320, { bridgeView: 'immersive', seismicEnabled: true, seismicIntensityG: 0, seismicTime: 5 });
    const select = page.getByRole('combobox', { name: 'Scene key moments', exact: true });
    await expect(select.locator('option[value="motion"]')).toBeDisabled();
    await expect(select.locator('option[value="acceleration"]')).toBeDisabled();
    await select.selectOption('free');
    await expect(page.locator('[data-bridge-moment-insight]')).toContainText('No ground motion was applied');
    await expect(page.locator('[data-bridge-moment-insight]')).toContainText('0.000 J/kg');
    await page.getByRole('slider', { name: 'Scene replay time (s)', exact: true }).press('ArrowRight');
    await expect(select).toHaveValue('');
    await expect(page.locator('[data-bridge-moment-insight]')).toHaveCount(0);
    expect(await page.evaluate(() => (window as any).__bucket().seismicTime)).toBe(16.05);
    await select.selectOption('end');
    expect(await page.evaluate(() => (window as any).__bucket().seismicTime)).toBe(24);
    await checkWorkflowHealth(page);
  });


  for (const width of [1000, 320]) {
    test('guide energy: inspect, record and print the free-vibration budget at ' + width + 'px', async ({ page }) => {
      const oracle = await loadGuideEnergyOracle();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await mountWorkflow(page, width, {
        bridgeView: '3d', seismicEnabled: true, seismicGuideOpen: true,
        seismicEnergyInterval: true, seismicIntervalPinS: 7.217,
        seismicPrediction: 'Keep notebook prediction', seismicObservation: 'Keep notebook evidence',
        seismicSceneNote: 'Keep scene note', seismicGuidePrediction: 'Keep guide prediction',
        seismicGuideClaim: 'Keep guide claim', seismicGuideReasoning: 'Keep guide reasoning'
      });
      const guide = page.locator('[data-bridge-damping-guide="interactive"]');
      const current = guide.locator('[data-guide-readings="current"]');
      const prepare = guide.getByRole('button', { name: 'Prepare 5% / 20% comparison', exact: true });
      await prepare.click();
      await expect(current.locator('[data-guide-energy-budget]')).toHaveCount(0);

      const inspect16 = guide.getByRole('button', { name: 'Inspect both at 16 s', exact: true });
      await inspect16.focus();
      await inspect16.press('Enter');
      await expect(inspect16).toBeFocused();
      let inputs = await guidePairInputs(page);
      let budget = await checkGuideEnergyBudget(current, oracle, inputs, 16);
      await expect(budget.locator('[data-guide-energy-coincident]')).toBeVisible();
      await captureImmersiveRegion(page, budget, 'guide-energy-' + width + '-16.png', ENHANCEMENT_REPORT);

      await page.evaluate(() => (window as any).__set({ seismicTime: 21.217 }));
      budget = await checkGuideEnergyBudget(current, oracle, inputs, 21.217);
      const ordinaryRange = Number(await budget.getAttribute('data-guide-energy-range'));
      await expect(budget.locator('[data-guide-energy-coincident]')).toHaveCount(0);
      await expect(current).toContainText('21.217 s');
      await captureImmersiveRegion(page, budget, 'guide-energy-' + width + '-fractional.png', ENHANCEMENT_REPORT);

      const inspect24 = guide.getByRole('button', { name: 'Inspect both at 24 s', exact: true });
      await inspect24.focus();
      await inspect24.press('Space');
      await expect(inspect24).toBeFocused();
      budget = await checkGuideEnergyBudget(current, oracle, inputs, 24);
      await expect(budget.locator('[data-guide-energy-observation-end]')).toBeVisible();
      expect(await page.evaluate(() => (window as any).__bucket())).toMatchObject({
        seismicTime: 24, seismicIntervalPinS: 7.217, seismicPlaying: false, autoDriving: false
      });

      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 0.000001 }));
      await prepare.click();
      await page.evaluate(() => (window as any).__set({ seismicTime: 21.217 }));
      inputs = await guidePairInputs(page);
      budget = await checkGuideEnergyBudget(current, oracle, inputs, 21.217);
      expect(Number(await budget.getAttribute('data-guide-energy-range')) / ordinaryRange)
        .toBeCloseTo(Math.pow(0.000001 / 0.12, 2), 18);
      for (const trial of ['a', 'b']) {
        await expect(budget.locator('[data-guide-energy-trial="' + trial + '"] [data-guide-energy-field="initial"]'))
          .toContainText(/e-\d+/);
      }
      await captureImmersiveRegion(page, budget, 'guide-energy-' + width + '-tiny.png', ENHANCEMENT_REPORT);

      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 0 }));
      await prepare.click();
      await page.evaluate(() => (window as any).__set({ seismicTime: 21.217 }));
      inputs = await guidePairInputs(page);
      budget = await checkGuideEnergyBudget(current, oracle, inputs, 21.217);
      await expect(budget.locator('[data-guide-energy-zero]')).toBeVisible();
      await expect(budget.locator('[data-guide-energy-bar]')).toHaveCount(0);
      await captureImmersiveRegion(page, budget, 'guide-energy-' + width + '-zero.png', ENHANCEMENT_REPORT);

      // A saved pair keeps its own conditions and both histories when B changes.
      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 0.000001 }));
      await prepare.click();
      await page.evaluate(() => (window as any).__set({ seismicFrequencyHz: 0.65, seismicTime: 21.217 }));
      inputs = await guidePairInputs(page);
      await expect(current.locator('[data-guide-comparison-context]'))
        .toHaveAttribute('data-guide-comparison-context', 'confounded');
      await guide.getByRole('button', { name: 'Record paired evidence', exact: true }).click();
      const recorded = guide.locator('[data-guide-readings="recorded"]');
      const recordedBudget = await checkGuideEnergyBudget(recorded, oracle, inputs, 21.217);
      const recordedValues = await recordedBudget.locator('[data-guide-energy-value]')
        .evaluateAll(nodes => nodes.map(node => node.getAttribute('data-guide-energy-value')));
      const recordedText = await recorded.textContent();
      await captureImmersiveRegion(page, recorded, 'guide-energy-' + width + '-recorded.png', ENHANCEMENT_REPORT);

      await page.evaluate(() => (window as any).__set({
        seismicFrequencyHz: 1.1, seismicIntensityG: 0.12, seismicDampingRatio: 0.35, seismicTime: 24
      }));
      await expect(guide.locator('[data-guide-evidence]')).toHaveAttribute('data-guide-evidence', 'earlier');
      await expect(recorded.locator('[data-guide-comparison-context]'))
        .toHaveAttribute('data-guide-comparison-context', 'confounded');
      expect(await recorded.textContent()).toBe(recordedText);
      await checkGuideEnergyBudget(recorded, oracle, inputs, 21.217);

      await guide.getByRole('button', { name: 'Open investigation report', exact: true }).click();
      const printedGuide = page.locator('[data-bridge-damping-guide="print"]');
      const printed = printedGuide.locator('[data-guide-readings="recorded"]');
      const printedBudget = await checkGuideEnergyBudget(printed, oracle, inputs, 21.217);
      expect(await printedBudget.locator('[data-guide-energy-value]')
        .evaluateAll(nodes => nodes.map(node => node.getAttribute('data-guide-energy-value')))).toEqual(recordedValues);
      await expect(printedGuide.locator('select,button,input,textarea')).toHaveCount(0);
      await page.emulateMedia({ media: 'print' });
      await captureImmersiveRegion(page, printed, 'guide-energy-' + width + '-print.png', ENHANCEMENT_REPORT);
      await page.emulateMedia({ media: 'screen' });
      expect(await page.evaluate(() => (window as any).__bucket())).toMatchObject({
        seismicTime: 24, seismicIntervalPinS: 7.217,
        seismicPrediction: 'Keep notebook prediction', seismicObservation: 'Keep notebook evidence',
        seismicSceneNote: 'Keep scene note', seismicGuidePrediction: 'Keep guide prediction',
        seismicGuideClaim: 'Keep guide claim', seismicGuideReasoning: 'Keep guide reasoning'
      });
      await checkWorkflowHealth(page);
    });
  }

  test('guide energy: prepared-pair provenance survives scene selection and graphics loss', async ({ page }) => {
    const oracle = await loadGuideEnergyOracle();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await mountWorkflow(page, 844, {
      bridgeView: 'immersive', bridgeObserver: 'bank', seismicEnabled: true,
      seismicGuideOpen: true, seismicEnergyInterval: true, seismicTime: 21.217,
      seismicIntervalPinS: 7.217, seismicDampingRatio: 0.12,
      seismicTrialName: 'Separate notebook reference', seismicObservation: 'Keep notebook explanation',
      seismicSceneNote: 'Keep scene note', seismicGuideClaim: 'Keep guide claim'
    });
    await page.getByRole('button', { name: 'Save earthquake trial', exact: true }).click();
    const savedTrials = await page.evaluate(() => JSON.stringify((window as any).__bucket().seismicTrials));
    const guide = page.locator('[data-bridge-damping-guide="interactive"]');
    await guide.getByRole('button', { name: 'Prepare 5% / 20% comparison', exact: true }).click();
    await page.evaluate(() => (window as any).__set({ seismicTime: 21.217 }));
    const inputs = await guidePairInputs(page);
    const current = guide.locator('[data-guide-readings="current"]');
    const budget = await checkGuideEnergyBudget(current, oracle, inputs, 21.217);
    const values = await budget.locator('[data-guide-energy-value]')
      .evaluateAll(nodes => nodes.map(node => node.getAttribute('data-guide-energy-value')));
    const before = await current.textContent();

    const claim = page.locator('[data-claim-evidence-disclosure]');
    await claim.locator(':scope > summary').click();
    const quantity = claim.getByRole('combobox', { name: 'Interval evidence quantity', exact: true });
    await quantity.selectOption('elastic');
    await expect(claim.locator('[data-claim-reference]')).toContainText('Separate notebook reference');
    await page.getByRole('button', { name: 'A · reference', exact: true }).click();
    await expect(page.locator('[data-bridge-scene-readout]')).toHaveAttribute('data-scene-trial', 'reference');
    expect(await current.textContent()).toBe(before);
    await checkGuideEnergyBudget(current, oracle, inputs, 21.217);
    await captureImmersiveRegion(page, current, 'guide-energy-844-scene-a.png', ENHANCEMENT_REPORT);

    await page.locator('[data-allo-fs-stage]').scrollIntoViewIfNeeded();
    await page.evaluate(() => {
      const canvas = document.querySelector('canvas[data-bridge-gl]') as HTMLCanvasElement;
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      const loss = gl?.getExtension('WEBGL_lose_context');
      if (!loss) throw Error('No graphics loss extension');
      (window as any).__guideEnergyLoss = loss;
      loss.loseContext();
    });
    await expect(page.locator('[data-bridge-elevation]')).toBeVisible();
    await expect(quantity).toHaveValue('elastic');
    expect(await current.textContent()).toBe(before);
    const fallback = await checkGuideEnergyBudget(current, oracle, inputs, 21.217);
    expect(await fallback.locator('[data-guide-energy-value]')
      .evaluateAll(nodes => nodes.map(node => node.getAttribute('data-guide-energy-value')))).toEqual(values);
    await captureImmersiveRegion(page, current, 'guide-energy-844-fallback.png', ENHANCEMENT_REPORT);
    await page.evaluate(() => (window as any).__guideEnergyLoss.restoreContext());
    await expect.poll(() => page.evaluate(() => (window as any).__gl().state)).toBe('ready');
    await expect(quantity).toHaveValue('elastic');
    expect(await page.evaluate(() => JSON.stringify((window as any).__bucket().seismicTrials))).toBe(savedTrials);
    expect(await page.evaluate(() => (window as any).__bucket())).toMatchObject({
      bridgeView: '2d', seismicSceneSource: 'guide', seismicSceneTrial: 'reference',
      seismicTime: 21.217, seismicIntervalPinS: 7.217,
      seismicObservation: 'Keep notebook explanation', seismicSceneNote: 'Keep scene note',
      seismicGuideClaim: 'Keep guide claim'
    });
    await checkWorkflowHealth(page);
  });

  for (const width of [1000,320]) {
    test('claim interval: follow the question, choose signed evidence and print at '+width+'px',async({page})=>{
      await page.emulateMedia({reducedMotion:'reduce'});
      await mountWorkflow(page,width,{bridgeView:'3d',seismicEnabled:true,seismicEnergyInterval:true,seismicTime:12.319,seismicIntervalPinS:7.217,seismicTrialName:'Energy reference',seismicPrediction:'Keep my prediction',seismicObservation:'Keep my explanation'});
      await page.getByRole('button',{name:'Labelled 2D view',exact:true}).click();
      await page.getByRole('button',{name:'Save earthquake trial',exact:true}).click();
      await page.evaluate(()=>(window as any).__set({seismicDampingRatio:0.2}));
      const disclosure=page.locator('[data-claim-evidence-disclosure]'),summary=disclosure.locator(':scope > summary'),card=disclosure.locator('[data-claim-window="interval"]'),select=card.getByRole('combobox',{name:'Interval evidence quantity',exact:true});
      await summary.focus();await summary.press('Enter');await expect(disclosure).toHaveAttribute('open','');
      await expect(select).toHaveValue('question');await expect(card).toHaveAttribute('data-claim-interval-measure','damping');await expect(card.locator('[data-claim-interval-scope]')).toContainText('B · current · Custom interval');
      const fields={input:'input',damping:'damping',stored:'stored',kinetic:'kinetic',elastic:'elastic'};
      async function checkValues(key:keyof typeof fields) {
        await expect(card).toHaveAttribute('data-claim-interval-measure',key);
        for(const trial of ['reference','current']) {
          const expected=await page.locator('[data-investigation-evidence="comparison"] [data-evidence-row="'+fields[key]+'"] [data-evidence-trial="'+trial+'"]').getAttribute('data-evidence-value');
          await expect(card.locator('[data-claim-trial="'+trial+'"]')).toHaveAttribute('data-claim-value',expected!);
        }
      }
      await page.getByRole('button',{name:'Ground removes energy',exact:true}).click();await checkValues('input');await expect(card.locator('[data-claim-interval-question]')).toHaveAttribute('data-claim-interval-question','returning');expect(Number(await card.locator('[data-claim-trial="current"]').getAttribute('data-claim-value'))).toBeLessThan(0);await expect(card.locator('[data-claim-sentence-frame]')).toContainText('net ground input work');
      await captureImmersiveRegion(page,disclosure,'bridge-'+width+'-claim-return.png',ENHANCEMENT_REPORT);
      await page.evaluate(()=>(window as any).__set({seismicPlaying:true,autoDriving:true}));await select.focus();await select.press('End');await expect(select).toHaveValue('elastic');await checkValues('elastic');await expect(select).toBeFocused();expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({seismicPlaying:false,autoDriving:false});
      for(const key of Object.keys(fields) as (keyof typeof fields)[]) {await select.selectOption(key);await checkValues(key);await expect(card).toHaveAttribute('data-claim-measure-source','manual');}
      const before=await card.locator('[data-claim-value]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-claim-value')));await page.getByRole('button',{name:'Swap moments',exact:true}).click();expect(await card.locator('[data-claim-value]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-claim-value')))).toEqual(before);
      await select.selectOption('input');await page.getByRole('button',{name:'After shaking',exact:true}).click();await checkValues('input');await expect(card).toHaveAttribute('data-claim-measure-source','manual');await expect(card.locator('[data-claim-interval-question]')).toHaveAttribute('data-claim-interval-question','settling');expect(Number(await card.locator('[data-claim-trial="current"]').getAttribute('data-claim-value'))).toBe(0);
      await select.selectOption('question');await checkValues('damping');await page.getByRole('button',{name:'Elastic → kinetic',exact:true}).click();await checkValues('kinetic');await expect(card.locator('[data-claim-interval-help]')).toContainText('different points in their cycles');await expect(card.locator('[data-claim-sentence-frame]')).toContainText('kinetic energy changed');await captureImmersiveRegion(page,disclosure,'bridge-'+width+'-claim-exchange.png',ENHANCEMENT_REPORT);
      await page.evaluate(()=>(window as any).__set({seismicIntensityG:0.000001}));await page.getByRole('button',{name:'Ground removes energy',exact:true}).click();await checkValues('input');await expect(card.locator('[data-claim-trial="current"]')).toContainText('e-');await expect(disclosure.locator('[data-claim-scientific-help]')).toBeVisible();await captureImmersiveRegion(page,disclosure,'bridge-'+width+'-claim-small.png',ENHANCEMENT_REPORT);
      await page.getByRole('button',{name:'Pin this frame',exact:true}).click();await expect(card).toHaveAttribute('data-claim-interval-measure','damping');await expect(card.locator('[data-claim-interval-question]')).toHaveCount(0);expect(await card.locator('[data-claim-value]').evaluateAll(nodes=>nodes.every(n=>Number(n.getAttribute('data-claim-value'))===0))).toBe(true);
      await page.evaluate(()=>(window as any).__set({seismicTime:12.319,seismicIntervalPinS:7.217}));await select.selectOption('stored');await checkValues('stored');const printedValues=await disclosure.locator('[data-claim-value]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-claim-value')));
      await page.getByRole('button',{name:'Open earthquake evidence report',exact:true}).click();const print=page.locator('[data-claim-evidence="print"]');await expect(print.locator('[data-claim-window="interval"]')).toHaveAttribute('data-claim-interval-measure','stored');expect(await print.locator('[data-claim-value]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-claim-value')))).toEqual(printedValues);await expect(print.locator('select,button,input,textarea')).toHaveCount(0);await page.emulateMedia({media:'print'});await captureImmersiveRegion(page,print,'bridge-'+width+'-claim-selected-print.png',ENHANCEMENT_REPORT);await page.emulateMedia({media:'screen'});
      expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({seismicPrediction:'Keep my prediction',seismicObservation:'Keep my explanation',seismicTime:12.319,seismicIntervalPinS:7.217});await checkWorkflowHealth(page);
    });
  }
  test('claim interval: manual quantity and notebook provenance survive scene graphics loss',async({page})=>{
    await page.emulateMedia({reducedMotion:'reduce'});await mountWorkflow(page,844,{bridgeView:'immersive',bridgeObserver:'bank',seismicEnabled:true,seismicEnergyInterval:true,seismicTime:7.217,seismicIntervalPinS:12.319,seismicTrialName:'Notebook reference',seismicObservation:'Keep notebook explanation',seismicSceneNote:'Keep scene note'});
    await page.getByRole('button',{name:'Save earthquake trial',exact:true}).click();await page.evaluate(()=>(window as any).__set({seismicGuideOpen:true}));await page.getByRole('button',{name:'Prepare 5% / 20% comparison',exact:true}).click();await page.evaluate(()=>(window as any).__set({seismicTime:7.217,seismicIntervalPinS:12.319}));await page.getByRole('button',{name:'A · reference',exact:true}).click();
    const disclosure=page.locator('[data-claim-evidence-disclosure]'),card=disclosure.locator('[data-claim-window="interval"]'),select=card.getByRole('combobox',{name:'Interval evidence quantity',exact:true});await disclosure.locator('summary').click();await select.selectOption('kinetic');const before=await card.textContent(),values=await card.locator('[data-claim-value]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-claim-value')));await expect(card.locator('[data-claim-interval-scope]')).toContainText('B · current');await captureImmersiveRegion(page,disclosure,'bridge-844-claim-scene.png',ENHANCEMENT_REPORT);
    await page.locator('[data-allo-fs-stage]').scrollIntoViewIfNeeded();await page.evaluate(()=>{const canvas=document.querySelector('canvas[data-bridge-gl]') as HTMLCanvasElement,gl=canvas.getContext('webgl2')||canvas.getContext('webgl'),loss=gl?.getExtension('WEBGL_lose_context');if(!loss)throw Error('No graphics loss extension');(window as any).__claimIntervalLoss=loss;loss.loseContext();});await expect(page.locator('[data-bridge-elevation]')).toBeVisible();await expect(select).toHaveValue('kinetic');expect(await card.textContent()).toBe(before);expect(await card.locator('[data-claim-value]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-claim-value')))).toEqual(values);await captureImmersiveRegion(page,disclosure,'bridge-844-claim-fallback.png',ENHANCEMENT_REPORT);await page.evaluate(()=>(window as any).__claimIntervalLoss.restoreContext());await expect.poll(()=>page.evaluate(()=>(window as any).__gl().state)).toBe('ready');await expect(select).toHaveValue('kinetic');expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({bridgeView:'2d',seismicSceneSource:'guide',seismicSceneTrial:'reference',seismicObservation:'Keep notebook explanation',seismicSceneNote:'Keep scene note',seismicTime:7.217,seismicIntervalPinS:12.319});await checkWorkflowHealth(page);
  });
  test('claim interval: recorded guide conditions and tiny values persist in the report',async({page})=>{
    await page.emulateMedia({reducedMotion:'reduce'});await mountWorkflow(page,320,{bridgeView:'3d',seismicEnabled:true,seismicGuideOpen:true,seismicIntensityG:0.000001,seismicGuidePrediction:'Keep guide prediction',seismicGuideClaim:'Keep my claim',seismicGuideReasoning:'Keep my reasoning'});await page.getByRole('button',{name:'Prepare 5% / 20% comparison',exact:true}).click();await page.evaluate(()=>(window as any).__set({seismicFrequencyHz:0.65,seismicTime:7.217}));
    const guide=page.locator('[data-bridge-damping-guide="interactive"]'),current=guide.locator('[data-guide-readings="current"]');await expect(current.locator('[data-guide-comparison-context]')).toHaveAttribute('data-guide-comparison-context','confounded');await page.getByRole('button',{name:'Record paired evidence',exact:true}).click();const recorded=guide.locator('[data-guide-readings="recorded"]');await expect(recorded.locator('[data-guide-comparison-context]')).toContainText('cannot isolate the effect of damping');await expect(recorded).toContainText('1.00e-6 g');expect(await recorded.locator('[data-guide-number]').evaluateAll(nodes=>nodes.some(n=>Number(n.getAttribute('data-guide-number'))!==0&&/e-\d/.test(n.textContent||'')))).toBe(true);
    await page.evaluate(()=>(window as any).__set({seismicFrequencyHz:1.1}));await expect(current.locator('[data-guide-comparison-context]')).toHaveAttribute('data-guide-comparison-context','controlled');await expect(recorded.locator('[data-guide-comparison-context]')).toHaveAttribute('data-guide-comparison-context','confounded');const readings=await recorded.locator('[data-guide-number]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-guide-number')));await captureImmersiveRegion(page,recorded,'bridge-320-guide-recorded-context.png',ENHANCEMENT_REPORT);
    await page.getByRole('button',{name:'Open investigation report',exact:true}).click();const print=page.locator('[data-bridge-damping-guide="print"] [data-guide-readings="recorded"]');await expect(print.locator('[data-guide-comparison-context]')).toHaveAttribute('data-guide-comparison-context','confounded');expect(await print.locator('[data-guide-number]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-guide-number')))).toEqual(readings);await expect(page.locator('[data-bridge-damping-guide="print"]').locator('select,button,input,textarea')).toHaveCount(0);await page.emulateMedia({media:'print'});await captureImmersiveRegion(page,print,'bridge-320-guide-recorded-print.png',ENHANCEMENT_REPORT);await page.emulateMedia({media:'screen'});expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({seismicGuidePrediction:'Keep guide prediction',seismicGuideClaim:'Keep my claim',seismicGuideReasoning:'Keep my reasoning'});await checkWorkflowHealth(page);
  });

  for(const width of [1000,320]){
    test('rate history: signed power shading, fractional endpoints and keyboard inspection at '+width+'px',async({page})=>{
      await page.emulateMedia({reducedMotion:'reduce'});await mountWorkflow(page,width,{bridgeView:'3d',seismicEnabled:true,seismicEnergyInterval:true,seismicTime:12.319,seismicIntervalPinS:7.217,seismicObservation:'Keep my explanation',seismicSceneNote:'Keep scene note'});await page.getByRole('button',{name:'Labelled 2D view',exact:true}).click();const detail=page.locator('[data-rate-history-disclosure="fallback"]');await expect(detail).not.toHaveAttribute('open');await detail.locator(':scope > summary').focus();await detail.locator(':scope > summary').press('Enter');await expect(detail).toHaveAttribute('open','');const frame=detail.locator('[data-rate-history]');await expect(frame).toHaveAttribute('data-rate-history-start','7.217');await expect(frame).toHaveAttribute('data-rate-history-end','12.319');await expect(frame.locator('[data-rate-curve]')).toHaveCount(2);await expect(frame.locator('[data-rate-history-provenance]')).toContainText('accumulated model work and loss');
      await expect(frame.locator('[data-rate-pattern="input"]')).toContainText('positive and negative parts');await expect(frame.locator('[data-rate-pattern="input"]')).toBeVisible();await expect(frame.locator('[data-rate-view-help]')).not.toContainText('A and B');await expect(frame).toHaveAttribute('data-rate-history-view','interval');const detailLines=await frame.locator('[data-rate-line]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('points')));await frame.getByRole('button',{name:'Full event',exact:true}).focus();await frame.getByRole('button',{name:'Full event',exact:true}).press('Enter');await expect(frame).toHaveAttribute('data-rate-history-view','event');expect(await frame.locator('[data-rate-line]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('points')))).not.toEqual(detailLines);await captureImmersiveRegion(page,detail,'bridge-'+width+'-rate-overview.png',ENHANCEMENT_REPORT);await frame.getByRole('button',{name:'Interval detail',exact:true}).click();await expect(frame).toHaveAttribute('data-rate-history-view','interval');const before=await frame.locator('[data-rate-area] path:first-child').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('d'))),values=await frame.locator('[data-rate-total]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-rate-total-value')));await page.getByRole('button',{name:'Swap moments',exact:true}).click();expect(await frame.locator('[data-rate-area] path:first-child').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('d')))).toEqual(before);expect(await frame.locator('[data-rate-total]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-rate-total-value')))).toEqual(values);await expect(frame.locator('[data-rate-history-markers]')).toContainText('Circle: pinned moment · 12.319 s');expect(await frame.locator('[data-rate-marker]').evaluateAll(nodes=>nodes.every(n=>(n as HTMLElement).offsetWidth===16&&(n as HTMLElement).offsetHeight===16))).toBe(true);await captureImmersiveRegion(page,detail,'bridge-'+width+'-rate-transfer.png',ENHANCEMENT_REPORT);
      await page.getByRole('button',{name:'Ground removes energy',exact:true}).click();expect(Number(await frame.locator('[data-rate-total="input"]').getAttribute('data-rate-total-value'))).toBeLessThan(0);await expect(frame.locator('[data-rate-area="negative"]')).not.toHaveCount(0);expect(await frame.locator('[data-rate-curve="input"] [data-rate-marker]').evaluateAll(nodes=>{const boxes=nodes.map(n=>n.getBoundingClientRect());return Math.abs(boxes[0].x-boxes[1].x);})).toBeGreaterThan(150);await captureImmersiveRegion(page,detail,'bridge-'+width+'-rate-removal.png',ENHANCEMENT_REPORT);
      await page.getByRole('button',{name:'Pin this frame',exact:true}).click();await expect(frame.locator('[data-rate-area]')).toHaveCount(0);await expect(frame.locator('[data-rate-history-coincident]')).toContainText('instantaneous rates can still be nonzero');await expect(frame.locator('[data-rate-pattern]')).toHaveCount(0);await expect(frame.getByRole('button',{name:'Interval detail',exact:true})).toBeDisabled();await expect(frame).toHaveAttribute('data-rate-history-view','event');await page.evaluate(()=>(window as any).__set({seismicIntensityG:0.000001,seismicIntervalPinS:16,seismicTime:24}));await expect(frame.locator('[data-rate-history-scientific-help]')).toBeVisible();expect(Number(await frame.locator('[data-rate-total="damping"]').getAttribute('data-rate-total-value'))).toBeGreaterThan(0);await captureImmersiveRegion(page,detail,'bridge-'+width+'-rate-settling.png',ENHANCEMENT_REPORT);
      await page.evaluate(()=>(window as any).__set({seismicIntensityG:0}));await expect(frame.locator('[data-rate-history-zero]')).toContainText('curves stay at zero');await expect(frame.locator('[data-rate-pattern="input"]')).toContainText('stays at zero');await expect(frame.locator('[data-rate-pattern="damping"]')).toContainText('stays at zero');await expect(frame.locator('[data-rate-area]')).toHaveCount(0);await captureImmersiveRegion(page,detail,'bridge-'+width+'-rate-zero.png',ENHANCEMENT_REPORT);expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({seismicObservation:'Keep my explanation',seismicSceneNote:'Keep scene note'});await checkWorkflowHealth(page);
    });
  }
  test('rate history: shared A/B scale, phone drawer scrolling and current graphics fallback',async({page})=>{
    await page.emulateMedia({reducedMotion:'reduce'});await mountWorkflow(page,320,{bridgeView:'immersive',bridgeObserver:'bank',bridgeBankYaw:18,seismicEnabled:true,seismicEnergyInterval:true,seismicGuideOpen:true,seismicSceneNote:'Keep my note'});await page.getByRole('button',{name:'Prepare 5% / 20% comparison',exact:true}).click();await page.evaluate(()=>(window as any).__set({seismicIntervalPinS:7.217,seismicTime:12.319}));await page.setViewportSize({width:320,height:568});const stage=page.locator('[data-allo-fs-stage]');await stage.scrollIntoViewIfNeeded();await page.getByRole('button',{name:'Focus scene',exact:true}).click();await page.getByRole('button',{name:'View the 3D bridge fullscreen',exact:true}).click();const drawer=page.locator('[data-bridge-scene-drawer]');await drawer.locator(':scope > summary').press('Enter');let detail=page.locator('[data-rate-history-disclosure="scene"]');await detail.locator(':scope > summary').press('Enter');let frame=detail.locator('[data-rate-history]');const current=await frame.locator('[data-rate-total]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-rate-total-value'))),range=await frame.getAttribute('data-rate-history-range');await frame.locator('[data-rate-curve="input"]').scrollIntoViewIfNeeded();await stage.screenshot({path:join(ENHANCEMENT_REPORT,'bridge-320-rate-scene.png')});await frame.locator('[data-rate-history-provenance]').scrollIntoViewIfNeeded();await expect(frame.locator('[data-rate-history-provenance]')).toBeVisible();await stage.screenshot({path:join(ENHANCEMENT_REPORT,'bridge-320-rate-scene-notes.png')});
    await page.getByRole('button',{name:'A · reference',exact:true}).click();await expect(frame).toHaveAttribute('data-rate-history-trial','reference');await expect(frame).toHaveAttribute('data-rate-history-range',range!);expect(await frame.locator('[data-rate-total]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-rate-total-value')))).not.toEqual(current);await frame.locator('[data-rate-curve="input"]').scrollIntoViewIfNeeded();await stage.screenshot({path:join(ENHANCEMENT_REPORT,'bridge-320-rate-reference.png')});expect(await drawer.evaluate(n=>n.scrollWidth-n.clientWidth)).toBeLessThanOrEqual(1);
    await stage.scrollIntoViewIfNeeded();await page.evaluate(()=>{const canvas=document.querySelector('canvas[data-bridge-gl]') as HTMLCanvasElement,gl=canvas.getContext('webgl2')||canvas.getContext('webgl'),loss=gl?.getExtension('WEBGL_lose_context');if(!loss)throw Error('No graphics loss extension');(window as any).__rateLoss=loss;loss.loseContext();});detail=page.locator('[data-rate-history-disclosure="fallback"]');await expect(detail).toHaveAttribute('open','');frame=detail.locator('[data-rate-history]');await expect(frame).toHaveAttribute('data-rate-history-trial','current');expect(await frame.locator('[data-rate-total]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-rate-total-value')))).toEqual(current);await captureImmersiveRegion(page,detail,'bridge-320-rate-fallback.png',ENHANCEMENT_REPORT);await page.evaluate(()=>(window as any).__rateLoss.restoreContext());await expect.poll(()=>page.evaluate(()=>(window as any).__gl().state)).toBe('ready');expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({bridgeView:'2d',bridgeBankYaw:18,seismicSceneTrial:'reference',seismicTime:12.319,seismicIntervalPinS:7.217,seismicSceneNote:'Keep my note'});await checkWorkflowHealth(page);
  });

  for(const width of [1000,320]){
    test('force motion: cycle causality, small signed values and zero damping at '+width+'px',async({page})=>{
      await page.emulateMedia({reducedMotion:'reduce'});await mountWorkflow(page,width,{bridgeView:'3d',seismicEnabled:true,seismicForceLens:true,seismicEnergyOrbit:true,seismicTime:16.01,seismicSceneNote:'Keep explanation',seismicEnergyInterval:true,seismicIntervalPinS:12.319});await page.getByRole('button',{name:'Labelled 2D view',exact:true}).click();const block=page.locator('[data-force-motion="fallback"]'),mechanism=page.locator('[data-force-motion="mechanism"]');
      await page.getByRole('button',{name:'Next turning point',exact:true}).click();await expect(block).toHaveAttribute('data-force-motion-kind','stationary');await expect(block.locator('[data-force-motion-direction]')).toHaveAttribute('data-force-motion-direction','0');await expect(mechanism).toHaveAttribute('data-force-motion-kind','stationary');const time=await block.getAttribute('data-force-motion-time');await expect(block.locator('[data-force-motion-caption]')).toContainText(Number(time).toFixed(3)+' s');await captureImmersiveRegion(page,block,'bridge-'+width+'-force-turning.png',ENHANCEMENT_REPORT);
      await page.getByRole('button',{name:'Next center crossing',exact:true}).click();await expect(block).toHaveAttribute('data-force-motion-kind','centered');await expect(block.locator('[data-force-motion-direction]')).not.toHaveAttribute('data-force-motion-direction','0');await expect(block.locator('[data-force-motion-insight]')).toContainText('relative motion can continue');await captureImmersiveRegion(page,page.locator('[data-bridge-seismic-mechanism]'),'bridge-'+width+'-force-center.png',ENHANCEMENT_REPORT);
      const disclosure=block.locator('[data-force-motion-rate-details]'),summary=disclosure.locator('summary');await summary.focus();await summary.press('Enter');await expect(disclosure).toHaveAttribute('open','');await expect(disclosure).toContainText('recomputed from displayed motion');await summary.press('Enter');await expect(disclosure).not.toHaveAttribute('open');
      await page.evaluate(()=>(window as any).__set({seismicIntensityG:0.000001,seismicTime:7.217}));await expect(block.locator('[data-force-motion-scientific-help]')).toContainText('2.5e-6 means 0.0000025');await expect(block.locator('[data-force-relative-speed]')).toContainText('e-');expect(await page.locator('[data-force-reading]').evaluateAll(nodes=>nodes.every(n=>/e-\d/.test(n.textContent||'')))).toBe(true);expect(await block.locator('[data-force-motion-direction]').evaluate(node=>{const box=node.getBoundingClientRect();return [box.width,box.height];})).toEqual([80,24]);await captureImmersiveRegion(page,page.locator('[data-bridge-force-lens="fallback"]'),'bridge-'+width+'-force-small.png',ENHANCEMENT_REPORT);
      await page.evaluate(()=>(window as any).__set({seismicDampingRatio:0}));await expect(block.locator('[data-force-motion-damping]')).toHaveAttribute('data-force-motion-damping','absent');await expect(block.locator('[data-force-motion-contribution="damping"]')).toHaveAttribute('data-force-motion-power','0');await page.evaluate(()=>(window as any).__set({seismicIntensityG:0}));await expect(block).toHaveAttribute('data-force-motion-kind','rest');await expect(block.locator('[data-force-motion-direction]')).toHaveAttribute('data-force-motion-direction','0');await expect(block.locator('[data-force-motion-scientific-help]')).toHaveCount(0);await captureImmersiveRegion(page,block,'bridge-'+width+'-force-rest.png',ENHANCEMENT_REPORT);expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({seismicTime:7.217,seismicSceneNote:'Keep explanation',seismicIntervalPinS:12.319});await checkWorkflowHealth(page);
    });
  }
  test('force motion: selected scene reference stays attributed through a cycle inspection and graphics recovery',async({page})=>{
    await page.emulateMedia({reducedMotion:'reduce'});await mountWorkflow(page,844,{bridgeView:'immersive',bridgeObserver:'bank',bridgeBankYaw:18,seismicEnabled:true,seismicForceLens:true,seismicEnergyOrbit:true,seismicTime:16.01,seismicTrialName:'Force reference',seismicSceneNote:'Keep scene note',seismicEnergyInterval:true,seismicIntervalPinS:12.319});await page.getByRole('button',{name:'Save earthquake trial',exact:true}).click();await page.evaluate(()=>(window as any).__set({seismicDampingRatio:0.2,seismicSceneCompare:true,seismicSceneSource:'saved',seismicSceneTrial:'reference'}));let block=page.locator('[data-force-motion="scene"]');await page.getByRole('button',{name:'Next turning point',exact:true}).click();await expect(block).toHaveAttribute('data-force-motion-kind','stationary');await expect(block.locator('[data-force-motion-caption]')).toContainText('A · reference');await expect(page.locator('[data-force-motion="mechanism"] [data-force-motion-caption]')).toContainText('Current experiment');const time=await block.getAttribute('data-force-motion-time');await page.locator('[data-allo-fs-stage]').scrollIntoViewIfNeeded();await page.evaluate(()=>{const canvas=document.querySelector('canvas[data-bridge-gl]') as HTMLCanvasElement,gl=canvas.getContext('webgl2')||canvas.getContext('webgl'),extension=gl?.getExtension('WEBGL_lose_context');if(!extension)throw Error('WebGL loss extension unavailable');(window as any).__forceMotionLoss=extension;extension.loseContext();});await expect(page.locator('[data-bridge-elevation]')).toBeVisible();block=page.locator('[data-force-motion="fallback"]');await expect(block).toHaveAttribute('data-force-motion-trial','current');await expect(block).toHaveAttribute('data-force-motion-time',time!);await expect(block.locator('[data-force-motion-caption]')).toContainText('Current experiment');const current=await block.textContent();await captureImmersiveRegion(page,block,'bridge-844-force-fallback.png',ENHANCEMENT_REPORT);await page.evaluate(()=>(window as any).__forceMotionLoss.restoreContext());await expect.poll(()=>page.evaluate(()=>(window as any).__gl().state)).toBe('ready');expect(await block.textContent()).toBe(current);expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({bridgeView:'2d',bridgeBankYaw:18,seismicSceneTrial:'reference',seismicSceneNote:'Keep scene note',seismicIntervalPinS:12.319});await checkWorkflowHealth(page);
  });

  for(const width of [1000,320]){
    test('motion coherence: readable fixed markers, precise values and unequal scene trials at '+width+'px',async({page})=>{
      await page.emulateMedia({reducedMotion:'reduce'});await mountWorkflow(page,width,{bridgeView:'immersive',bridgeObserver:'bank',seismicEnabled:true,seismicMotionGuide:true,seismicTime:7.217,seismicTrialName:'Large reference',seismicSceneNote:'Keep scene writing',seismicEnergyInterval:true,seismicIntervalPinS:12.319});
      await page.getByRole('button',{name:'From the riverbank',exact:true}).click();
      const guide=page.locator('[data-bridge-motion-guide]'),frame=page.locator('[data-motion-frame]');
      // Camera debug values update when the scene is visible and renders.
      await page.locator('[data-allo-fs-stage]').scrollIntoViewIfNeeded();
      await expect.poll(() => page.evaluate(() => (window as any).__bucket().bridgeObserver)).toBe('bank');
      await expect.poll(() => page.evaluate(() => (window as any).__gl().cameraMode)).toBe('bank');
      const initialPosition = await checkMotionPositionDiagram(frame);
      const originalCamera = await page.evaluate(() => ({ yaw: (window as any).__bucket().bridgeBankYaw || 0, pitch: (window as any).__bucket().bridgeBankPitch || 0, direction: (window as any).__gl().cameraDirection }));
      await page.evaluate(() => (window as any).__set({ bridgeBankYaw: 45, bridgeBankPitch: 7 }));
      await expect.poll(() => page.evaluate(() => (window as any).__gl().cameraDirection)).not.toEqual(originalCamera.direction);
      expect(await checkMotionPositionDiagram(frame)).toEqual(initialPosition);
      await page.evaluate(camera => (window as any).__set({ bridgeBankYaw: camera.yaw, bridgeBankPitch: camera.pitch }), originalCamera);
      // Compare the tiny trial against the same damping and time at ordinary amplitude.
      await page.evaluate(() => (window as any).__set({ seismicDampingRatio: 0.2 }));
      const ordinaryPosition = await checkMotionPositionDiagram(frame);
      await page.evaluate(() => (window as any).__set({ seismicDampingRatio: 0.05 }));
      const checkMarkers=async()=>{const boxes=await frame.locator('[data-motion-marker]').evaluateAll(nodes=>nodes.map(node=>{const box=node.getBoundingClientRect(),rail=node.parentElement!.getBoundingClientRect();return {width:box.width,height:box.height,left:box.left,right:box.right,railLeft:rail.left,railRight:rail.right};}));expect(boxes).toHaveLength(4);for(const box of boxes){expect(box.width).toBeCloseTo(16,5);expect(box.height).toBeCloseTo(16,5);expect(box.left).toBeGreaterThanOrEqual(box.railLeft-1);expect(box.right).toBeLessThanOrEqual(box.railRight+1);}};
      await expect(frame.locator('[data-motion-caption]')).toContainText('Current experiment · 7.217 s');await checkMarkers();await captureImmersiveRegion(page,page.locator('[data-allo-fs-stage]'),'bridge-'+width+'-motion-scene.png',ENHANCEMENT_REPORT);
      await page.getByRole('button',{name:'Save earthquake trial',exact:true}).click();await page.evaluate(()=>(window as any).__set({seismicIntensityG:0.000001,seismicDampingRatio:0.2,seismicSceneCompare:true,seismicSceneSource:'saved',seismicSceneTrial:'current'}));const range=await frame.getAttribute('data-motion-range-m'),b=await frame.locator('[data-motion-reading="deck"]').getAttribute('data-motion-value-m');await expect(frame.locator('[data-motion-caption]')).toContainText('B · current');await expect(frame.locator('[data-motion-scientific-help]')).toContainText('2.5e-6 means 0.0000025');
      const tinyPaired = await checkMotionPositionDiagram(frame);
      expect(tinyPaired.gapWidth).toBeGreaterThan(0);
      expect(tinyPaired.gapWidth).toBeLessThan(0.01);
      await page.getByRole('button',{name:'A · reference',exact:true}).click();await expect(frame.locator('[data-motion-caption]')).toContainText('A · reference · 7.217 s');await expect(frame).toHaveAttribute('data-motion-range-m',range!);expect(await frame.locator('[data-motion-reading="deck"]').getAttribute('data-motion-value-m')).not.toBe(b);await checkMarkers();const referencePosition=await checkMotionPositionDiagram(frame);expect(referencePosition.range).toBe(tinyPaired.range);await captureImmersiveRegion(page,guide,'bridge-'+width+'-motion-reference.png',ENHANCEMENT_REPORT);
      await page.getByRole('button',{name:'Labelled 2D view',exact:true}).click();await expect(frame).toHaveAttribute('data-motion-trial','current');await expect(frame).toHaveAttribute('data-motion-source','current');await expect(frame.locator('[data-motion-reading="deck"]')).toHaveAttribute('data-motion-value-m',b!);expect(Number(await frame.getAttribute('data-motion-range-m'))).toBeLessThan(Number(range));await expect(frame.locator('[data-motion-range-caption]')).toContainText('e-');await expect(frame.locator('[data-motion-reading="deck"] strong')).toContainText('e-');await checkMarkers();const tinyPosition=await checkMotionPositionDiagram(frame);expect(tinyPosition.x.deck).toBeCloseTo(ordinaryPosition.x.deck,8);expect(tinyPosition.x.ground).toBeCloseTo(ordinaryPosition.x.ground,8);expect(tinyPosition.gapWidth).toBeCloseTo(ordinaryPosition.gapWidth,8);await captureImmersiveRegion(page,frame.locator('[data-motion-position-diagram]'),'bridge-'+width+'-position-small.png',ENHANCEMENT_REPORT);await captureImmersiveRegion(page,guide,'bridge-'+width+'-motion-small.png',ENHANCEMENT_REPORT);
      await page.evaluate(()=>(window as any).__set({seismicIntensityG:0}));await expect(frame.locator('[data-motion-zero]')).toContainText('stay at rest');await expect(frame.locator('[data-motion-range-caption]')).toHaveCount(0);await expect(frame.locator('[data-motion-scientific-help]')).toHaveCount(0);await checkMarkers();const restingPosition=await checkMotionPositionDiagram(frame);expect(restingPosition.readings).toEqual({ground:0,deck:0,relative:0});expect(restingPosition.x).toEqual({deck:200,ground:200});await captureImmersiveRegion(page,guide,'bridge-'+width+'-motion-zero.png',ENHANCEMENT_REPORT);expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({seismicSceneNote:'Keep scene writing',seismicTime:7.217,seismicIntervalPinS:12.319,seismicSceneTrial:'reference'});await checkWorkflowHealth(page);
    });
  }
  test('motion coherence: selected scene A falls back to current motion and recovers without changing the investigation',async({page})=>{
    await page.emulateMedia({reducedMotion:'reduce'});await mountWorkflow(page,844,{bridgeView:'immersive',bridgeObserver:'bank',bridgeBankYaw:18,seismicEnabled:true,seismicMotionGuide:true,seismicTime:7.217,seismicTrialName:'Notebook motion reference',seismicSceneNote:'Keep explanation',seismicEnergyInterval:true,seismicIntervalPinS:12.319});await page.getByRole('button',{name:'From the riverbank',exact:true}).click();await page.getByRole('button',{name:'Save earthquake trial',exact:true}).click();await page.evaluate(()=>(window as any).__set({seismicDampingRatio:0.2,seismicSceneCompare:true,seismicSceneSource:'saved',seismicSceneTrial:'reference'}));const frame=page.locator('[data-motion-frame]');await expect(frame).toHaveAttribute('data-motion-trial','reference');const a=await frame.locator('[data-motion-reading="deck"]').getAttribute('data-motion-value-m');await checkMotionPositionDiagram(frame);await page.locator('[data-allo-fs-stage]').scrollIntoViewIfNeeded();await page.evaluate(()=>{const canvas=document.querySelector('canvas[data-bridge-gl]') as HTMLCanvasElement,gl=canvas.getContext('webgl2')||canvas.getContext('webgl'),extension=gl?.getExtension('WEBGL_lose_context');if(!extension)throw Error('WebGL loss extension unavailable');(window as any).__motionLoss=extension;extension.loseContext();});await expect(page.locator('[data-bridge-elevation]')).toBeVisible();await expect(frame).toHaveAttribute('data-motion-trial','current');expect(await frame.locator('[data-motion-reading="deck"]').getAttribute('data-motion-value-m')).not.toBe(a);const current=await frame.textContent();const fallbackPosition=await checkMotionPositionDiagram(frame);await captureImmersiveRegion(page,page.locator('[data-bridge-motion-guide="fallback"]'),'bridge-844-motion-fallback.png',ENHANCEMENT_REPORT);await page.evaluate(()=>(window as any).__motionLoss.restoreContext());await expect.poll(()=>page.evaluate(()=>(window as any).__gl().state)).toBe('ready');expect(await frame.textContent()).toBe(current);expect(await checkMotionPositionDiagram(frame)).toEqual(fallbackPosition);expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({bridgeView:'2d',seismicSceneTrial:'reference',bridgeBankYaw:18,seismicTime:7.217,seismicSceneNote:'Keep explanation',seismicIntervalPinS:12.319});await checkWorkflowHealth(page);
  });

  for(const width of [1000,320]){
    test('recorded maxima: shared peak inspection, signed markers and small curves at '+width+'px',async({page})=>{
      await page.emulateMedia({reducedMotion:'reduce'});await mountWorkflow(page,width,{bridgeView:'3d',seismicEnabled:true,seismicTime:2,seismicTrialName:'First notebook reference',seismicPrediction:'Keep prediction',seismicObservation:'Keep explanation',seismicEnergyInterval:true,seismicIntervalPinS:12.319});await page.getByRole('button',{name:'Save earthquake trial',exact:true}).click();await page.evaluate(()=>(window as any).__set({seismicDampingRatio:0.2,seismicTrialName:'Second notebook reference'}));await page.getByRole('button',{name:'Save earthquake trial',exact:true}).click();await page.evaluate(()=>(window as any).__set({seismicDampingRatio:0.1}));await page.getByRole('button',{name:'Compare on timeline',exact:true}).click();const timeline=page.locator('[data-bridge-seismic-timeline]'),guide=timeline.locator('[data-seismic-recorded-peak-guide]'),slider=timeline.locator('[data-seismic-chart-slider]');await expect(guide).toContainText('First notebook reference');
      const checkPeakLabels=async()=>{
        const boxes=await timeline.locator('[data-recorded-peak-marker] > span').evaluateAll(nodes=>nodes.map(node=>{const box=node.getBoundingClientRect();return {left:box.left,right:box.right,top:box.top,bottom:box.bottom};}));
        expect(boxes).toHaveLength(2);const [a,b]=boxes;
        expect(a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top).toBe(true);
      };
      for(const measure of ['relative','acceleration','stored']){await page.getByRole('combobox',{name:'Comparison measure',exact:true}).selectOption(measure);await expect(guide).toHaveAttribute('data-seismic-recorded-peak-guide',measure);await checkPeakLabels();const before=await timeline.locator('[data-recorded-peak-marker]').evaluateAll(nodes=>nodes.map(n=>n.outerHTML));await page.evaluate(()=>(window as any).__set({seismicTime:21.217}));expect(await timeline.locator('[data-recorded-peak-marker]').evaluateAll(nodes=>nodes.map(n=>n.outerHTML))).toEqual(before);for(const id of ['reference','current']){const peak=guide.locator('[data-recorded-peak-trial="'+id+'"]'),time=Number(await peak.getAttribute('data-recorded-peak-time')),magnitude=Number(await peak.getAttribute('data-recorded-peak-magnitude'));await peak.getByRole('button').click();await expect(slider).toBeFocused();expect(await page.evaluate(()=>(window as any).__bucket().seismicTime)).toBe(time);expect(Math.abs(Number(await timeline.locator('[data-seismic-compare-value="'+id+'"]').getAttribute('data-comparison-frame-value')))).toBeCloseTo(magnitude,14);await expect(slider).toHaveAttribute('aria-valuetext',new RegExp(time.toFixed(3)+' s'));}if(measure==='relative')await captureImmersiveRegion(page,timeline,'bridge-'+width+'-recorded-maxima.png',ENHANCEMENT_REPORT);}
      await page.getByRole('combobox',{name:'Timeline reference trial',exact:true}).selectOption('1');await expect(guide).toContainText('Second notebook reference');await page.getByRole('combobox',{name:'Comparison measure',exact:true}).selectOption('relative');await checkPeakLabels();await page.evaluate(()=>(window as any).__set({seismicDampingRatio:0.2}));await checkPeakLabels();await page.evaluate(()=>(window as any).__set({seismicIntensityG:0.000001,seismicTrials:[],seismicTrialName:'Tiny reference',seismicDampingRatio:0.05}));await page.getByRole('button',{name:'Save earthquake trial',exact:true}).click();await page.evaluate(()=>(window as any).__set({seismicDampingRatio:0.2}));await page.getByRole('button',{name:'Compare on timeline',exact:true}).click();await guide.locator('[data-recorded-peak-shortcut="current"]').click();await expect(guide.locator('[data-recorded-peak-scientific-help]')).toContainText('2.5e-6 means 0.0000025');await expect(timeline.locator('[data-seismic-compare-value="current"]')).toContainText('e-');await expect(timeline).toContainText('1.00e-6 g');const tinyCurves=await timeline.locator('[data-seismic-comparison-curves] polyline').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('points')));expect(tinyCurves.every(points=>points!==null&&!/NaN|Infinity/.test(points))).toBe(true);await checkPeakLabels();await captureImmersiveRegion(page,timeline,'bridge-'+width+'-small-recorded-maxima.png',ENHANCEMENT_REPORT);
      await page.getByRole('button',{name:'Labelled 2D view',exact:true}).click();expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({seismicPrediction:'Keep prediction',seismicObservation:'Keep explanation',seismicIntervalPinS:12.319,seismicPlaying:false,autoDriving:false});await page.evaluate(()=>(window as any).__set({seismicIntensityG:0,seismicTrials:[],seismicTrialName:'Zero reference'}));await page.getByRole('button',{name:'Save earthquake trial',exact:true}).click();await page.getByRole('button',{name:'Compare on timeline',exact:true}).click();await expect(guide.locator('[data-recorded-peak-zero]')).toHaveCount(2);await expect(guide.locator('[data-recorded-peak-shortcut="reference"]')).toBeDisabled();await expect(guide.locator('[data-recorded-peak-shortcut="current"]')).toBeDisabled();await expect(timeline.locator('[data-recorded-peak-marker]')).toHaveCount(0);await checkWorkflowHealth(page);
    });
  }
  test('recorded maxima: guided scene A stays selected through peak inspection and graphics recovery',async({page})=>{
    await page.emulateMedia({reducedMotion:'reduce'});await mountWorkflow(page,844,{bridgeView:'immersive',bridgeObserver:'bank',bridgeBankYaw:18,seismicEnabled:true,seismicDampingRatio:0.1,seismicTime:2,seismicTrialName:'Notebook reference',seismicGuideOpen:true,seismicEnergyInterval:true,seismicIntervalPinS:12.319,seismicSceneNote:'Keep scene writing'});await page.getByRole('button',{name:'Save earthquake trial',exact:true}).click();await page.getByRole('button',{name:'Prepare 5% / 20% comparison',exact:true}).click();await page.getByRole('button',{name:'A · reference',exact:true}).click();await page.getByRole('button',{name:'Compare on timeline',exact:true}).click();const timeline=page.locator('[data-bridge-seismic-timeline]'),guide=timeline.locator('[data-seismic-recorded-peak-guide]');await guide.locator('[data-recorded-peak-shortcut="reference"]').click();const time=await page.evaluate(()=>(window as any).__bucket().seismicTime),before=await guide.textContent();expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({seismicSceneSource:'guide',seismicSceneTrial:'reference',bridgeObserver:'bank',bridgeBankYaw:18,seismicSceneNote:'Keep scene writing'});
    await page.locator('[data-allo-fs-stage]').scrollIntoViewIfNeeded();await page.evaluate(()=>{const canvas=document.querySelector('canvas[data-bridge-gl]') as HTMLCanvasElement;const gl=canvas.getContext('webgl2')||canvas.getContext('webgl');const extension=gl?.getExtension('WEBGL_lose_context');if(!extension)throw Error('WebGL loss extension unavailable');(window as any).__peakLoss=extension;extension.loseContext();});await expect(page.locator('[data-bridge-elevation]')).toBeVisible();expect(await guide.textContent()).toBe(before);expect(await page.evaluate(()=>(window as any).__bucket().seismicTime)).toBe(time);await captureImmersiveRegion(page,timeline,'bridge-844-fallback-recorded-maxima.png',ENHANCEMENT_REPORT);await page.evaluate(()=>(window as any).__peakLoss.restoreContext());await expect.poll(()=>page.evaluate(()=>(window as any).__gl().state)).toBe('ready');await guide.locator('[data-recorded-peak-shortcut="current"]').click();await expect(timeline.locator('[data-seismic-chart-slider]')).toBeFocused();expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({bridgeView:'2d',seismicSceneSource:'guide',seismicSceneTrial:'reference',seismicIntervalPinS:12.319,seismicSceneNote:'Keep scene writing'});await checkWorkflowHealth(page);
  });

  for(const width of [1000,320]){
    test('claim evidence: time windows, keyboard disclosure, reference and printed draft at '+width+'px',async({page})=>{
      await page.emulateMedia({reducedMotion:'reduce'});await mountWorkflow(page,width,{bridgeView:'3d',seismicEnabled:true,seismicTime:2,seismicTrialName:'First notebook reference',seismicPrediction:'Keep my prediction',seismicObservation:'Keep my explanation'});await page.getByRole('button',{name:'Save earthquake trial',exact:true}).click();await page.evaluate(()=>(window as any).__set({seismicDampingRatio:0.2,seismicTime:5,seismicTrialName:'Second notebook reference'}));await page.getByRole('button',{name:'Save earthquake trial',exact:true}).click();await page.evaluate(()=>(window as any).__set({seismicDampingRatio:0.1,seismicEnergyInterval:true,seismicIntervalPinS:12.319,seismicTime:7.217}));
      const disclosure=page.locator('[data-claim-evidence-disclosure]'),guide=disclosure.locator('[data-claim-evidence]'),summary=disclosure.locator('summary');await expect(disclosure).not.toHaveAttribute('open');await summary.focus();await summary.press('Enter');await expect(disclosure).toHaveAttribute('open','');await expect(guide.locator('[data-claim-window]')).toHaveCount(3);await expect(guide.locator('[data-claim-reference]')).toContainText('First notebook reference');await expect(guide.locator('[data-claim-window="moment"] [data-claim-window-time]')).toHaveText('7.217 s');await expect(guide.locator('[data-claim-window="interval"] [data-claim-window-time]')).toHaveText('7.217–12.319 s');const b=await guide.locator('[data-claim-window="moment"] [data-claim-trial="current"]').getAttribute('data-claim-value');await page.getByRole('combobox',{name:'Earthquake reference trial',exact:true}).selectOption('1');await expect(guide.locator('[data-claim-reference]')).toContainText('Second notebook reference');await expect(guide.locator('[data-claim-window="moment"] [data-claim-trial="current"]')).toHaveAttribute('data-claim-value',b!);
      const layout=await guide.locator('[data-claim-window]').evaluateAll(nodes=>nodes.map(n=>({x:n.getBoundingClientRect().x,y:n.getBoundingClientRect().y})));if(width===320){expect(layout[1].y).toBeGreaterThan(layout[0].y);expect(layout[2].y).toBeGreaterThan(layout[1].y);}else{expect(layout[1].x).toBeGreaterThan(layout[0].x);expect(layout[2].x).toBeGreaterThan(layout[1].x);}await captureImmersiveRegion(page,disclosure,'bridge-'+width+'-claim-evidence.png',ENHANCEMENT_REPORT);
      const fixed=await guide.locator('[data-claim-window="event"] [data-claim-value]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-claim-value')));await page.evaluate(()=>(window as any).__set({seismicTime:16}));expect(await guide.locator('[data-claim-window="event"] [data-claim-value]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-claim-value')))).toEqual(fixed);await page.evaluate(()=>(window as any).__set({seismicTime:7.217,seismicIntervalPinS:7.217}));await expect(guide).toContainText('The two moments coincide');expect(await guide.locator('[data-claim-window="interval"] [data-claim-value]').evaluateAll(nodes=>nodes.every(n=>Number(n.getAttribute('data-claim-value'))===0))).toBe(true);
      await page.evaluate(()=>(window as any).__set({seismicIntervalPinS:12.319,seismicIntensityG:0.000001}));await expect(guide.locator('[data-claim-scientific-help]')).toContainText('2.5e-6 means 0.0000025');await expect(guide.locator('[data-claim-window="event"] [data-claim-trial="current"]')).toContainText('e-');await page.getByRole('button',{name:'Labelled 2D view',exact:true}).click();const values=await guide.locator('[data-claim-value]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-claim-value')));await page.getByRole('button',{name:'Open earthquake evidence report',exact:true}).click();const printed=page.locator('[data-claim-evidence="print"]');expect(await printed.locator('[data-claim-value]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-claim-value')))).toEqual(values);await expect(printed.locator('details,button,input,textarea,select')).toHaveCount(0);await page.emulateMedia({media:'print'});await captureImmersiveRegion(page,printed,'bridge-'+width+'-print-claim-evidence.png',ENHANCEMENT_REPORT);await page.emulateMedia({media:'screen'});expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({seismicPrediction:'Keep my prediction',seismicObservation:'Keep my explanation',seismicReferenceIndex:1,seismicTime:7.217,seismicIntervalPinS:12.319});await checkWorkflowHealth(page);
    });
  }
  test('claim evidence: notebook provenance and current readings survive graphics fallback with scene A selected',async({page})=>{
    await page.emulateMedia({reducedMotion:'reduce'});await mountWorkflow(page,844,{bridgeView:'immersive',bridgeObserver:'bank',seismicEnabled:true,seismicTrialName:'Notebook energy reference',seismicTime:2});await page.getByRole('button',{name:'Save earthquake trial',exact:true}).click();await page.evaluate(()=>(window as any).__set({seismicGuideOpen:true,seismicEnergyInterval:true}));await page.getByRole('button',{name:'Prepare 5% / 20% comparison',exact:true}).click();await page.evaluate(()=>(window as any).__set({seismicTime:7.217,seismicIntervalPinS:12.319}));await page.getByRole('button',{name:'A · reference',exact:true}).click();const guide=page.locator('[data-claim-evidence]');await page.locator('[data-claim-evidence-disclosure] summary').click();await expect(guide.locator('[data-claim-reference]')).toContainText('Notebook energy reference');const before=await guide.textContent();
    await page.locator('[data-allo-fs-stage]').scrollIntoViewIfNeeded();await page.evaluate(()=>{const canvas=document.querySelector('canvas[data-bridge-gl]') as HTMLCanvasElement;const gl=canvas.getContext('webgl2')||canvas.getContext('webgl');const extension=gl?.getExtension('WEBGL_lose_context');if(!extension)throw Error('WebGL loss extension unavailable');(window as any).__claimLoss=extension;extension.loseContext();});await expect(page.locator('[data-bridge-elevation]')).toBeVisible();expect(await guide.textContent()).toBe(before);await captureImmersiveRegion(page,page.locator('[data-claim-evidence-disclosure]'),'bridge-844-fallback-claim-evidence.png',ENHANCEMENT_REPORT);await page.evaluate(()=>(window as any).__claimLoss.restoreContext());await expect.poll(()=>page.evaluate(()=>(window as any).__gl().state)).toBe('ready');expect(await guide.textContent()).toBe(before);expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({bridgeView:'2d',seismicSceneSource:'guide',seismicSceneTrial:'reference',seismicTime:7.217,seismicIntervalPinS:12.319});await checkWorkflowHealth(page);
  });

  for (const width of [1000,320]) {
    test('energy accounting: shared event scale, empty and small readings at '+width+'px', async ({page}) => {
      await page.emulateMedia({reducedMotion:'reduce'});await mountWorkflow(page,width,{bridgeView:'3d',seismicEnabled:true,seismicTime:7.217,seismicIntervalPinS:12.319,seismicPrediction:'Keep my prediction',seismicObservation:'Keep my explanation'});
      const map=page.locator('[data-seismic-energy-map]'),ledger=map.locator('[data-seismic-energy-accounting]');await expect(ledger).toHaveAttribute('data-energy-accounting-time','7.217');const scale=await ledger.getAttribute('data-energy-balance-scale');
      const reading=async(id:string)=>Number(await ledger.locator('[data-energy-balance-total="'+id+'"]').getAttribute('data-energy-value'));expect(await reading('input')).toBeCloseTo(await reading('accounted'),7);await expect(ledger.locator('[data-energy-balance-equation]')).toContainText('≈');await captureImmersiveRegion(page,map,'bridge-'+width+'-energy-accounting.png',ENHANCEMENT_REPORT);
      const why=ledger.locator('summary');await why.focus();await why.press('Enter');await expect(ledger.locator('[data-energy-balance-details]')).toHaveAttribute('open','');await expect(ledger.locator('[data-energy-balance-residual]')).toBeVisible();await expect(ledger.locator('[data-energy-balance-details]')).toContainText('small time steps');
      await page.evaluate(()=>(window as any).__set({seismicTime:16}));const input=await reading('input'),stored=Number(await map.locator('[data-energy-map-amount="stored"]').getAttribute('data-energy-value')),loss=Number(await map.locator('[data-energy-map-amount="damping"]').getAttribute('data-energy-value'));await page.evaluate(()=>(window as any).__set({seismicTime:24}));await expect(ledger).toHaveAttribute('data-energy-balance-scale',scale!);expect(await reading('input')).toBe(input);expect(Number(await map.locator('[data-energy-map-amount="stored"]').getAttribute('data-energy-value'))).toBeLessThan(stored);expect(Number(await map.locator('[data-energy-map-amount="damping"]').getAttribute('data-energy-value'))).toBeGreaterThan(loss);
      await page.evaluate(()=>(window as any).__set({seismicIntensityG:0,seismicTime:7.217}));await expect(ledger).toHaveAttribute('data-energy-balance-maximum','0');expect(await ledger.locator('[data-energy-balance-bar]').evaluateAll(nodes=>nodes.every(n=>(n as HTMLElement).style.width==='0%'))).toBe(true);await expect(map.locator('[data-energy-map-scientific-help]')).toHaveCount(0);await expect(ledger).toContainText('All bars are empty');
      await page.evaluate(()=>(window as any).__set({seismicIntensityG:0.000001}));expect(Number(await ledger.getAttribute('data-energy-balance-scale'))).toBeGreaterThan(0);expect(Number(await ledger.getAttribute('data-energy-balance-scale'))).toBeLessThan(0.001);await expect(map.locator('[data-energy-map-scientific-help]')).toContainText('2.5e-6 means 0.0000025');expect((await map.textContent())!.match(/Scientific notation:/g)).toHaveLength(1);await expect(ledger.locator('[data-energy-balance-total="input"]')).toContainText('e-');await why.press('Enter');await captureImmersiveRegion(page,map,'bridge-'+width+'-small-energy-accounting.png',ENHANCEMENT_REPORT);
      await page.getByRole('button',{name:'Labelled 2D view',exact:true}).click();await expect(ledger).toBeVisible();expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({seismicTime:7.217,seismicIntervalPinS:12.319,seismicPrediction:'Keep my prediction',seismicObservation:'Keep my explanation'});await checkWorkflowHealth(page);
    });
  }
  test('energy accounting: selected scene A and graphics recovery preserve current balance', async ({page}) => {
    await page.emulateMedia({reducedMotion:'reduce'});await mountWorkflow(page,844,{bridgeView:'immersive',bridgeObserver:'bank',seismicEnabled:true,seismicTime:7.217});await page.getByRole('button',{name:'Save earthquake trial',exact:true}).click();await page.evaluate(()=>(window as any).__set({seismicDampingRatio:0.2,seismicSceneCompare:true,seismicSceneSource:'saved',seismicSceneTrial:'reference'}));const map=page.locator('[data-seismic-energy-map]'),ledger=map.locator('[data-seismic-energy-accounting]'),before=await ledger.textContent();await expect(map.locator('[data-energy-map-caption]')).toContainText('Current experiment · 7.217 s');
    await page.locator('[data-allo-fs-stage]').scrollIntoViewIfNeeded();await page.evaluate(()=>{const canvas=document.querySelector('canvas[data-bridge-gl]') as HTMLCanvasElement;const gl=canvas.getContext('webgl2')||canvas.getContext('webgl');const extension=gl?.getExtension('WEBGL_lose_context');if(!extension)throw Error('WebGL loss extension unavailable');(window as any).__accountingLoss=extension;extension.loseContext();});await expect(page.locator('[data-bridge-elevation]')).toBeVisible();expect(await ledger.textContent()).toBe(before);await captureImmersiveRegion(page,map,'bridge-844-fallback-energy-accounting.png',ENHANCEMENT_REPORT);await page.evaluate(()=>(window as any).__accountingLoss.restoreContext());await expect.poll(()=>page.evaluate(()=>(window as any).__gl().state)).toBe('ready');expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({bridgeView:'2d',seismicSceneTrial:'reference',seismicTime:7.217});expect(await ledger.textContent()).toBe(before);await checkWorkflowHealth(page);
  });

  for (const width of [1000,320]) {
    test('learning route: coherent energy map and notebook navigation at '+width+'px', async ({page}) => {
      await page.emulateMedia({reducedMotion:'reduce'});await mountWorkflow(page,width,{bridgeView:'3d',seismicEnabled:true,seismicTime:7.217,seismicIntervalPinS:12.319,seismicEnergyInterval:true,seismicScenePrediction:'Separate scene writing'});
      const route=page.locator('[data-investigation-route]'),map=page.locator('[data-seismic-energy-map]');await expect(route.getByRole('button')).toHaveCount(4);await expect(map.locator('[data-energy-map-caption]')).toHaveText('Current experiment · 7.217 s · Shaking phase');
      await captureImmersiveRegion(page,route,'bridge-'+width+'-investigation-route.png',ENHANCEMENT_REPORT);await captureImmersiveRegion(page,map,'bridge-'+width+'-energy-map.png',ENHANCEMENT_REPORT);
      const layout=await map.locator('[data-energy-map-node]').evaluateAll(nodes=>nodes.map(n=>({x:n.getBoundingClientRect().x,y:n.getBoundingClientRect().y})));if(width<=640){expect(layout[1].y).toBeGreaterThan(layout[0].y);expect(layout[2].y).toBeGreaterThan(layout[1].y);}else{expect(layout[1].x).toBeGreaterThan(layout[0].x);expect(layout[2].x).toBeGreaterThan(layout[1].x);}
      await page.getByRole('button',{name:'Predict · Go to earthquake prediction',exact:true}).click();const prediction=page.getByRole('textbox',{name:'Earthquake prediction',exact:true});await expect(prediction).toBeFocused();await prediction.fill('More damping will change the response.');
      await page.getByRole('button',{name:'Inspect · Go to earthquake timeline',exact:true}).click();const timeline=page.locator('[data-seismic-chart-slider]');await expect(timeline).toBeFocused();expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({seismicTime:7.217,seismicIntervalPinS:12.319,seismicPlaying:false,autoDriving:false});
      await page.getByRole('button',{name:'Compare · Go to save earthquake trial',exact:true}).click();const save=page.getByRole('button',{name:'Save earthquake trial',exact:true});await expect(save).toBeFocused();expect(await page.evaluate(()=>(window as any).__bucket().seismicTrials)).toBeUndefined();await save.press('Enter');const record=await page.evaluate(()=>(window as any).__bucket().seismicTrials[0]);
      await page.evaluate(()=>(window as any).__set({seismicDampingRatio:0.2}));await page.getByRole('button',{name:'Compare · Go to saved-trial comparison',exact:true}).click();await expect(page.locator('[data-seismic-trial-comparison]')).toBeFocused();expect(await page.evaluate(()=>(window as any).__bucket().seismicTrials[0])).toEqual(record);
      await page.getByRole('button',{name:'Explain · Go to earthquake explanation',exact:true}).click();const explanation=page.getByRole('textbox',{name:'Earthquake observation and explanation',exact:true});await expect(explanation).toBeFocused();await explanation.fill('At 7.217 s the readings show energy stored and dissipated.');expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({seismicTime:7.217,seismicIntervalPinS:12.319,seismicDampingRatio:0.2,seismicPrediction:'More damping will change the response.',seismicScenePrediction:'Separate scene writing',seismicPlaying:false,autoDriving:false});
      await page.evaluate(()=>(window as any).__set({seismicIntensityG:0.000001}));await expect(map.locator('[data-energy-map-amount="stored"]')).toContainText('e-');await page.getByRole('button',{name:'Labelled 2D view',exact:true}).click();await expect(map).toBeVisible();await page.getByRole('button',{name:'Inspect · Go to earthquake timeline',exact:true}).click();await expect(timeline).toBeFocused();await checkWorkflowHealth(page);
    });
  }
  test('learning route: current energy and navigation survive graphics loss with scene A selected', async ({page}) => {
    await page.emulateMedia({reducedMotion:'reduce'});await mountWorkflow(page,844,{bridgeView:'immersive',bridgeObserver:'bank',seismicEnabled:true,seismicTime:16,seismicTrialName:'Original scene reference'});await page.getByRole('button',{name:'Save earthquake trial',exact:true}).click();await page.evaluate(()=>(window as any).__set({seismicDampingRatio:0.2,seismicSceneCompare:true,seismicSceneSource:'saved',seismicSceneTrial:'reference'}));const map=page.locator('[data-seismic-energy-map]'),before=await map.textContent();await expect(map.locator('[data-energy-map-caption]')).toHaveText('Current experiment · 16.000 s · Free vibration');await expect(map.locator('[data-energy-map-connector="input"]')).toContainText('No input transfer now');expect(Number(await map.locator('[data-energy-map-amount="stored"]').getAttribute('data-energy-value'))).toBeGreaterThan(0);
    await page.locator('[data-allo-fs-stage]').scrollIntoViewIfNeeded();await page.evaluate(()=>{const canvas=document.querySelector('canvas[data-bridge-gl]') as HTMLCanvasElement;const gl=canvas.getContext('webgl2')||canvas.getContext('webgl');const extension=gl?.getExtension('WEBGL_lose_context');if(!extension)throw Error('WebGL loss extension unavailable');(window as any).__routeLoss=extension;extension.loseContext();});await expect(page.locator('[data-bridge-elevation]')).toBeVisible();expect(await map.textContent()).toBe(before);await page.getByRole('button',{name:'Compare · Go to saved-trial comparison',exact:true}).click();await expect(page.locator('[data-seismic-trial-comparison]')).toBeFocused();await captureImmersiveRegion(page,map,'bridge-844-fallback-energy-map.png',ENHANCEMENT_REPORT);
    await page.evaluate(()=>(window as any).__routeLoss.restoreContext());await expect.poll(()=>page.evaluate(()=>(window as any).__gl().state)).toBe('ready');expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({bridgeView:'2d',seismicSceneTrial:'reference',seismicTime:16});await page.getByRole('button',{name:'Explain · Go to earthquake explanation',exact:true}).click();await expect(page.getByRole('textbox',{name:'Earthquake observation and explanation',exact:true})).toBeFocused();await page.evaluate(()=>(window as any).__set({seismicTime:24}));await expect(map.locator('[data-energy-map-caption]')).toHaveText('Current experiment · 24.000 s · Observation ends');await checkWorkflowHealth(page);
  });

  test('paired intervals: notebook reference survives graphics loss while scene A stays selected',async({page})=>{
    await page.emulateMedia({reducedMotion:'reduce'});await mountWorkflow(page,844,{bridgeView:'immersive',bridgeObserver:'bank',seismicEnabled:true,seismicTrialName:'Saved energy reference',seismicEnergyInterval:true,seismicGuideOpen:true});await page.getByRole('button',{name:'Save earthquake trial',exact:true}).click();await page.getByRole('button',{name:'Prepare 5% / 20% comparison',exact:true}).click();await page.getByRole('button',{name:'A · reference',exact:true}).click();await page.getByRole('button',{name:'After shaking',exact:true}).click();const pair=page.locator('[data-seismic-interval-comparison]'),evidence=pair.locator('[data-investigation-evidence="comparison"]');await expect(pair).toContainText('Saved energy reference');await expect(evidence).not.toHaveAttribute('data-evidence-selected');await expect(evidence.locator('[data-evidence-question]')).toContainText('B · current');const values=await evidence.locator('[data-evidence-value]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-evidence-value')));
    await page.evaluate(()=>{const canvas=document.querySelector('canvas[data-bridge-gl]') as HTMLCanvasElement;const gl=canvas.getContext('webgl2')||canvas.getContext('webgl');const extension=gl?.getExtension('WEBGL_lose_context');if(!extension)throw Error('WebGL loss extension unavailable');(window as any).__pairedLoss=extension;extension.loseContext();});await expect(page.locator('[data-bridge-elevation]')).toBeVisible();expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({bridgeView:'2d',seismicSceneTrial:'reference',seismicTime:24,seismicIntervalPinS:16});expect(await evidence.locator('[data-evidence-value]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-evidence-value')))).toEqual(values);await captureImmersiveRegion(page,pair,'bridge-844-fallback-paired-interval.png',ENHANCEMENT_REPORT);await page.evaluate(()=>(window as any).__pairedLoss.restoreContext());await expect.poll(()=>page.evaluate(()=>(window as any).__gl().state)).toBe('ready');expect(await page.evaluate(()=>(window as any).__bucket().bridgeView)).toBe('2d');expect(await evidence.locator('[data-evidence-value]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-evidence-value')))).toEqual(values);await checkWorkflowHealth(page);
  });
  for(const width of [1000,320]){
    test('paired intervals: shared 2D energy evidence, reference selection and print at '+width+'px',async({page})=>{
      await mountWorkflow(page,width,{bridgeView:'3d',seismicEnabled:true,seismicTrialName:'First energy reference'});await page.getByRole('button',{name:'Save earthquake trial',exact:true}).click();await page.evaluate(()=>(window as any).__set({seismicDampingRatio:0.2,seismicTrialName:'Second energy reference'}));await page.getByRole('button',{name:'Save earthquake trial',exact:true}).click();await page.getByRole('button',{name:'Labelled 2D view',exact:true}).click();await page.evaluate(()=>(window as any).__set({seismicDampingRatio:0.1,seismicEnergyInterval:true,seismicIntervalPinS:12.319,seismicTime:7.217}));const pair=page.locator('[data-seismic-interval-comparison]'),evidence=pair.locator('[data-investigation-evidence="comparison"]');await expect(evidence).toHaveAttribute('data-evidence-start','7.217');await expect(evidence).toHaveAttribute('data-evidence-end','12.319');await expect(evidence.locator('[data-evidence-column]')).toHaveCount(2);const before=await evidence.locator('[data-evidence-value]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-evidence-value')));await page.getByRole('combobox',{name:'Earthquake reference trial',exact:true}).selectOption('1');await expect(pair).toContainText('Second energy reference');const changed=await evidence.locator('[data-evidence-value]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-evidence-value')));expect(changed).not.toEqual(before);await captureImmersiveRegion(page,pair,'bridge-'+width+'-2d-paired-interval.png',ENHANCEMENT_REPORT);expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({bridgeView:'2d',seismicTime:7.217,seismicIntervalPinS:12.319});await page.getByRole('button',{name:'Open earthquake evidence report',exact:true}).click();const printed=page.locator('[data-bridge-print-seismic] [data-seismic-interval-comparison]');expect(await printed.locator('[data-evidence-value]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-evidence-value')))).toEqual(changed);await expect(printed.locator('button,input,textarea,select')).toHaveCount(0);await checkWorkflowHealth(page);
    });
  }
  for(const width of [1000,320]){
    test('comparison clarity: tiny changes, retained focus and print at '+width+'px',async({page})=>{
      await mountWorkflow(page,width,{bridgeView:'3d',seismicEnabled:true,seismicIntensityG:0.000001});await page.getByRole('button',{name:'Save earthquake trial',exact:true}).click();await page.evaluate(()=>(window as any).__set({seismicArchetype:'stiff',seismicDampingRatio:0.2}));const comparison=page.locator('[data-seismic-trial-comparison]'),action=page.getByRole('button',{name:'Isolate damping change',exact:true});await action.focus();await action.press('Enter');await expect(comparison).toBeFocused();await expect(comparison.locator('[data-controlled-comparison]')).toHaveCount(0);await page.keyboard.press('Tab');await expect(page.getByRole('combobox',{name:'Earthquake reference trial',exact:true})).toBeFocused();const table=comparison.locator('[data-seismic-trial-table]');await expect(table.locator('[data-comparison-change]').first()).toContainText('e-');const values=await table.locator('[data-comparison-value]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-comparison-value')));expect(await comparison.locator('[data-response-reading]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-response-value')))).toEqual(values);await captureImmersiveRegion(page,table,'bridge-'+width+'-precise-comparison-table.png',ENHANCEMENT_REPORT);await page.getByRole('button',{name:'Open earthquake evidence report',exact:true}).click();const print=page.locator('[data-bridge-print-seismic] [data-seismic-trial-comparison]');expect(await print.locator('[data-comparison-value]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-comparison-value')))).toEqual(values);await expect(print.locator('[data-comparison-precision-help]')).toBeVisible();await checkWorkflowHealth(page);
    });
  }
  for(const width of [1000,320]){
    test('comparison bars: shared scales, stable replay and print at '+width+'px',async({page})=>{
      await mountWorkflow(page,width,{bridgeView:'3d',seismicEnabled:true,seismicTrialName:'Visual reference'});await page.getByRole('button',{name:'Save earthquake trial',exact:true}).click();await page.evaluate(()=>(window as any).__set({seismicDampingRatio:0.2}));const visual=page.locator('[data-seismic-comparison-visual]');await expect(visual.locator('[data-response-pair]')).toHaveCount(4);const readings=await visual.locator('[data-response-pair]').evaluateAll(nodes=>nodes.map(n=>({scale:n.getAttribute('data-response-scale'),values:[...n.querySelectorAll('[data-response-reading]')].map(v=>v.getAttribute('data-response-value')),widths:[...n.querySelectorAll('[data-response-bar]')].map(v=>(v as HTMLElement).style.width)})));for(const pair of readings){expect(Number(pair.scale)).toBe(Math.max(...pair.values.map(Number)) || 1);expect(Math.max(...pair.widths.map(parseFloat))).toBe(100);}await captureImmersiveRegion(page,visual,'bridge-'+width+'-paired-response-bars.png',ENHANCEMENT_REPORT);await page.evaluate(()=>(window as any).__set({seismicTime:21.217}));expect(await visual.locator('[data-response-reading]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-response-value')))).toEqual(readings.flatMap(pair=>pair.values));await page.getByRole('button',{name:'Open earthquake evidence report',exact:true}).click();const print=page.locator('[data-bridge-print-seismic] [data-seismic-comparison-visual]');await expect(print).toContainText('different measures use different scales');expect(await print.locator('[data-response-reading]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-response-value')))).toEqual(readings.flatMap(pair=>pair.values));await expect(print.locator('button,input,textarea,select')).toHaveCount(0);await checkWorkflowHealth(page);
    });
  }
  for(const width of [1000,320]){
    test('controlled comparison: isolate damping and response mode at '+width+'px',async({page})=>{
      await mountWorkflow(page,width,{bridgeView:'3d',seismicEnabled:true,seismicTrialName:'Controlled reference'});await page.getByRole('button',{name:'Save earthquake trial',exact:true}).click();const ref=await page.evaluate(()=>(window as any).__bucket().seismicTrials[0]);await page.evaluate(()=>(window as any).__set({seismicArchetype:'stiff',seismicDampingRatio:0.2,seismicFrequencyHz:2.3,seismicIntensityG:0.3,seismicTime:7.217,seismicIntervalPinS:12.319,seismicEnergyInterval:true,seismicPrediction:'Keep my prediction'}));const comparison=page.locator('[data-seismic-trial-comparison]');await captureImmersiveRegion(page,comparison.locator('[data-controlled-comparison]'),'bridge-'+width+'-controlled-comparison.png',ENHANCEMENT_REPORT);const damping=page.getByRole('button',{name:'Isolate damping change',exact:true});await damping.focus();await damping.press('Enter');expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({seismicArchetype:ref.inputs.archetype,seismicFrequencyHz:ref.inputs.groundFrequencyHz,seismicIntensityG:ref.inputs.intensityG,seismicDampingRatio:0.2,seismicTime:7.217,seismicIntervalPinS:12.319,seismicPrediction:'Keep my prediction',seismicPlaying:false});await expect(comparison).toContainText('Changed settings: Damping ratio (%)');await expect(comparison.locator('[data-controlled-comparison]')).toHaveCount(0);
      await page.evaluate(()=>(window as any).__set({seismicArchetype:'stiff',seismicDampingRatio:0.2}));await page.getByRole('button',{name:'Isolate response mode change',exact:true}).click();expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({seismicArchetype:'stiff',seismicDampingRatio:ref.inputs.dampingRatio,seismicTime:7.217,seismicIntervalPinS:12.319});await expect(comparison).toContainText('Changed settings: Response mode');await page.getByRole('button',{name:'Open earthquake evidence report',exact:true}).click();await expect(page.locator('[data-bridge-print-seismic]')).toContainText('Changed settings: Response mode');await expect(page.locator('[data-bridge-print-seismic] [data-controlled-comparison]')).toHaveCount(0);await checkWorkflowHealth(page);
    });
  }
  for(const width of [1000,320]){
    test('small readouts: late-stage energy and signed power in saved print at '+width+'px',async({page})=>{
      await mountWorkflow(page,width,{bridgeView:'3d',seismicEnabled:true,seismicSceneRecording:true,seismicDampingRatio:0.2,seismicTime:21.217});await page.getByRole('button',{name:'Save scene observation',exact:true}).click();const article=page.locator('[data-seismic-trial]').first();const energy=await article.locator('[data-seismic-saved-energy]').textContent(),power=await article.locator('[data-seismic-scene-power]').textContent();expect(energy).toMatch(/e-\d/);expect(power).toMatch(/-\d\.\d{2}e-\d/);await expect(article.locator('[data-seismic-scientific-help]')).toContainText('2.5e-6 means 0.0000025');
      await page.getByRole('button',{name:'Open earthquake evidence report',exact:true}).click();const saved=page.locator('[data-bridge-print-seismic] [data-seismic-trial]').first();await expect(saved.locator('[data-seismic-saved-energy]')).toHaveText(energy!);await expect(saved.locator('[data-seismic-scene-power]')).toHaveText(power!);await expect(saved.locator('button,input,textarea,select')).toHaveCount(0);await captureImmersiveRegion(page,saved,'bridge-'+width+'-small-saved-readouts.png',ENHANCEMENT_REPORT);await checkWorkflowHealth(page);
    });
  }
  for(const width of [1000,320]){
    test('interval controls: exact times, keyboard swap and stable paired evidence at '+width+'px',async({page})=>{
      await page.emulateMedia({reducedMotion:'reduce'});await mountWorkflow(page,width,{bridgeView:'immersive',bridgeObserver:'bank',seismicEnabled:true,seismicEnergyInterval:true,seismicGuideOpen:true});await page.getByRole('button',{name:'Prepare 5% / 20% comparison',exact:true}).click();await page.getByRole('button',{name:'A · reference',exact:true}).click();await page.getByRole('button',{name:'After shaking',exact:true}).click();
      const interval=page.locator('[data-bridge-energy-interval="scene"]'),evidence=page.locator('[data-investigation-evidence="scene"]');const values=await evidence.locator('[data-evidence-value]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-evidence-value')));const swap=interval.getByRole('button',{name:'Swap moments',exact:true});await swap.focus();await swap.press('Enter');await expect(interval.locator('[data-interval-window]')).toHaveAttribute('data-interval-start','16');await expect(interval.locator('[data-interval-window]')).toHaveAttribute('data-interval-end','24');expect(await evidence.locator('[data-evidence-value]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-evidence-value')))).toEqual(values);expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({seismicTime:16,seismicIntervalPinS:24,seismicSceneTrial:'reference',seismicPlaying:false});
      await interval.getByRole('spinbutton',{name:'Inspected time (s)',exact:true}).fill('17.137');await expect(interval.locator('[data-interval-window]')).toHaveAttribute('data-interval-start','17.137');await expect(interval.getByRole('button',{name:'After shaking',exact:true})).toHaveAttribute('aria-pressed','false');await captureImmersiveRegion(page,interval.locator('[data-interval-time-controls]'),'bridge-'+width+'-exact-time-controls.png',ENHANCEMENT_REPORT);await checkWorkflowHealth(page);
      await page.getByRole('button',{name:'Labelled 2D view',exact:true}).click();const fallback=page.locator('[data-bridge-energy-interval="fallback"]');await expect(fallback.getByRole('spinbutton',{name:'Inspected time (s)',exact:true})).toHaveValue('17.137');await fallback.getByRole('spinbutton',{name:'Pinned time (s)',exact:true}).fill('17.137');await expect(fallback.getByRole('button',{name:'Swap moments',exact:true})).toBeDisabled();await checkWorkflowHealth(page);
    });
  }
  for(const width of [1000,320]){
    test('draft report: unsaved interval evidence and notes at '+width+'px',async({page})=>{
      await mountWorkflow(page,width,{bridgeView:'3d',seismicEnabled:true,seismicEnergyInterval:true,seismicIntervalPinS:12.319,seismicTime:7.217});await page.getByRole('button',{name:'Labelled 2D view',exact:true}).click();
      await page.getByRole('textbox',{name:'Earthquake prediction',exact:true}).fill('Energy can return to the ground.');await page.getByRole('textbox',{name:'Earthquake observation and explanation',exact:true}).fill('Use the exact interval to support this explanation.');
      const values=await page.locator('[data-bridge-seismic-notebook] [data-investigation-evidence="draft"] [data-evidence-value]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-evidence-value')));
      await page.getByRole('button',{name:'Open earthquake evidence report',exact:true}).click();const draft=page.locator('[data-notebook-print-draft]'),evidence=draft.locator('[data-investigation-evidence="draft"]');await expect(evidence).toHaveAttribute('data-evidence-start','7.217');await expect(evidence).toHaveAttribute('data-evidence-end','12.319');expect(await evidence.locator('[data-evidence-value]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-evidence-value')))).toEqual(values);
      await expect(draft).toContainText('Inspected time: 7.217 s');await expect(draft).toContainText('Energy can return to the ground.');await expect(draft).toContainText('Current draft evidence');await expect(draft.locator('button,input,textarea,select')).toHaveCount(0);expect(await page.evaluate(()=>(window as any).__bucket().seismicTrials || [])).toHaveLength(0);
      await captureImmersiveRegion(page,draft,'bridge-'+width+'-unsaved-draft-report.png',ENHANCEMENT_REPORT);await checkWorkflowHealth(page);
    });
  }
  for(const width of [1000,320]){
    test('notebook intervals: save and restore labelled 2D evidence and print at '+width+'px',async({page})=>{
      await mountWorkflow(page,width,{bridgeView:'3d',seismicEnabled:true,seismicEnergyInterval:true,seismicScenePrediction:'Keep my scene draft'});
      await page.getByRole('button',{name:'Labelled 2D view',exact:true}).click();await page.getByRole('button',{name:'After shaking',exact:true}).click();
      const notebook=page.locator('[data-bridge-seismic-notebook]'),draft=notebook.locator('[data-investigation-evidence="draft"]');
      await page.getByRole('textbox',{name:'Earthquake trial name',exact:true}).fill('After shaking in 2D');await page.getByRole('textbox',{name:'Earthquake prediction',exact:true}).fill('The remaining energy should become damping loss.');await page.getByRole('textbox',{name:'Earthquake observation and explanation',exact:true}).fill('Input work is zero after ground motion ends.');
      await expect(draft).toHaveAttribute('data-evidence-start','16');await expect(draft).toHaveAttribute('data-evidence-end','24');await expect(draft.locator('[data-evidence-question]')).toHaveAttribute('data-evidence-question','settling');
      const values=await draft.locator('[data-evidence-value]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-evidence-value')));await captureImmersiveRegion(page,draft,'bridge-'+width+'-2d-notebook-evidence.png',ENHANCEMENT_REPORT);
      await page.getByRole('button',{name:'Save earthquake trial',exact:true}).click();const record=await page.evaluate(()=>(window as any).__bucket().seismicTrials[0]);expect(record.investigation).toEqual({version:'bridge-energy-investigation-v1',pinTimeS:16});expect(record.scene).toBeUndefined();
      await page.evaluate(()=>(window as any).__set({seismicEnergyInterval:false,seismicIntervalPinS:3.1,seismicTime:7.217,seismicDampingRatio:0.4,seismicPrediction:'Changed prediction',seismicObservation:'Changed observation'}));
      await page.getByRole('button',{name:'Restore earthquake trial 1: After shaking in 2D',exact:true}).click();expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({bridgeView:'2d',seismicTime:24,seismicIntervalPinS:16,seismicEnergyInterval:true,seismicSceneTrial:'current',seismicSceneCompare:false,seismicScenePrediction:'Keep my scene draft'});
      await expect(page.getByRole('textbox',{name:'Earthquake prediction',exact:true})).toHaveValue(record.prediction);expect(await draft.locator('[data-evidence-value]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-evidence-value')))).toEqual(values);
      await page.getByRole('spinbutton',{name:'Pinned time (s)',exact:true}).fill('17.137');await expect(draft).toHaveAttribute('data-evidence-start','17.137');await expect(draft.locator('[data-evidence-question]')).toHaveCount(0);
      await page.getByRole('button',{name:'Open earthquake evidence report',exact:true}).click();const article=page.locator('[data-bridge-print-seismic] [data-seismic-trial]').first(),saved=article.locator('[data-investigation-evidence="saved"]');
      await expect(article.locator('[data-seismic-investigation-question]')).toHaveAttribute('data-seismic-investigation-question','settling');await expect(saved).toHaveAttribute('data-evidence-start','16');await expect(saved).toHaveAttribute('data-evidence-end','24');expect(await saved.locator('[data-evidence-value]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-evidence-value')))).toEqual(values);
      await expect(article).toContainText(record.prediction);await expect(article).toContainText(record.observation);await expect(article.locator('[data-seismic-scene-context]')).toHaveCount(0);await expect(article.locator('button,input,textarea,select')).toHaveCount(0);
      await captureImmersiveRegion(page,saved,'bridge-'+width+'-2d-notebook-print.png',ENHANCEMENT_REPORT);await checkWorkflowHealth(page);
    });
  }
  test('notebook intervals: graphics loss preserves current-experiment writing and inspection through recovery',async({page})=>{
    await page.emulateMedia({reducedMotion:'reduce'});await mountWorkflow(page,844,{bridgeView:'immersive',bridgeObserver:'bank',seismicEnabled:true,seismicEnergyInterval:true,seismicGuideOpen:true});
    await page.getByRole('button',{name:'Prepare 5% / 20% comparison',exact:true}).click();await page.getByRole('button',{name:'A · reference',exact:true}).click();await page.getByRole('button',{name:'After shaking',exact:true}).click();
    const draft=page.locator('[data-bridge-seismic-notebook] [data-investigation-evidence="draft"]'),values=await draft.locator('[data-evidence-value]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-evidence-value')));
    await page.evaluate(()=>{const canvas=document.querySelector('canvas[data-bridge-gl]') as HTMLCanvasElement;const gl=canvas.getContext('webgl2')||canvas.getContext('webgl');const extension=gl?.getExtension('WEBGL_lose_context');if(!extension)throw Error('WebGL loss extension unavailable');(window as any).__notebookLoss=extension;extension.loseContext();});
    await expect(page.locator('[data-bridge-elevation]')).toBeVisible();await expect(draft).toContainText('Current experiment');expect(await draft.locator('[data-evidence-value]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-evidence-value')))).toEqual(values);
    await page.getByRole('textbox',{name:'Earthquake trial name',exact:true}).fill('Fallback interval');await page.getByRole('textbox',{name:'Earthquake prediction',exact:true}).fill('The interval can be inspected in 2D.');await page.getByRole('textbox',{name:'Earthquake observation and explanation',exact:true}).fill('The notebook keeps current-experiment evidence.');await page.getByRole('button',{name:'Save earthquake trial',exact:true}).click();
    const record=await page.evaluate(()=>(window as any).__bucket().seismicTrials[0]);expect(record.inputs.dampingRatio).toBe(0.2);expect(record.investigation.pinTimeS).toBe(16);expect(record.scene).toBeUndefined();
    await page.evaluate(()=>(window as any).__set({seismicEnergyInterval:false,seismicTime:3.1,seismicIntervalPinS:0}));await page.getByRole('button',{name:'Restore earthquake trial 1: Fallback interval',exact:true}).click();expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({bridgeView:'2d',seismicEnergyInterval:true,seismicIntervalPinS:16,seismicTime:24,seismicSceneCompare:false,seismicSceneTrial:'current',seismicPlaying:false});
    await captureImmersiveRegion(page,draft,'bridge-844-graphics-fallback-notebook.png',ENHANCEMENT_REPORT);await page.evaluate(()=>(window as any).__notebookLoss.restoreContext());await expect.poll(()=>page.evaluate(()=>(window as any).__gl().state)).toBe('ready');expect(await page.evaluate(()=>(window as any).__bucket().bridgeView)).toBe('2d');
    await page.getByRole('button',{name:'From the riverbank',exact:true}).click();await page.locator('[data-allo-fs-stage]').scrollIntoViewIfNeeded();await expect(page.locator('[data-bridge-scene-readout]')).toHaveAttribute('data-scene-trial','current');await checkWorkflowHealth(page);
  });

  for(const size of [{width:1000,height:800},{width:320,height:568}]){
    test('writing evidence: scene prediction, A/B interval and printed explanation at '+size.width+'px',async({page})=>{
      await mountWorkflow(page,size.width,{bridgeView:'immersive',bridgeObserver:'bank',seismicEnabled:true,seismicEnergyInterval:true,seismicSceneRecording:true,seismicGuideOpen:true,crossSectionMm2:30000,lateralBraceEvery:1});
      await page.setViewportSize(size);await page.getByRole('button',{name:'Prepare 5% / 20% comparison',exact:true}).click();
      const stage=page.locator('[data-allo-fs-stage]');await stage.scrollIntoViewIfNeeded();await page.getByRole('button',{name:'Focus scene',exact:true}).click();await page.getByRole('button',{name:'View the 3D bridge fullscreen',exact:true}).click();
      const drawer=page.locator('[data-bridge-scene-drawer]');await drawer.locator('summary').first().press('Enter');
      const recorder=page.locator('[data-bridge-scene-recorder]'),prediction=page.getByRole('textbox',{name:'Scene prediction',exact:true});
      await prediction.fill('More damping should dissipate more of the remaining energy.');await page.getByRole('button',{name:'After shaking',exact:true}).click();
      const evidence=recorder.locator('[data-investigation-evidence="scene"]');await expect(evidence).toHaveAttribute('data-evidence-start','16');await expect(evidence).toHaveAttribute('data-evidence-end','24');
      const values=()=>evidence.locator('[data-evidence-value]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-evidence-value'))),before=await values();await page.getByRole('button',{name:'A · reference',exact:true}).click();await expect(evidence).toHaveAttribute('data-evidence-selected','reference');expect(await values()).toEqual(before);
      await expect(prediction).toHaveValue('More damping should dissipate more of the remaining energy.');
      await evidence.evaluate(node=>node.scrollIntoView({block:'start',behavior:'instant'}));
      expect(await evidence.evaluate(node=>node.scrollWidth-node.clientWidth)).toBeLessThanOrEqual(1);const table=evidence.locator('table');
      const tableBox=await table.boundingBox(),heading=await drawer.locator('summary').first().boundingBox(),drawerBox=await drawer.boundingBox();expect(tableBox!.y).toBeGreaterThanOrEqual(heading!.y+heading!.height);expect(tableBox!.y+tableBox!.height).toBeLessThanOrEqual(drawerBox!.y+drawerBox!.height-4);
      await stage.screenshot({path:join(ENHANCEMENT_REPORT,'bridge-'+size.width+'-writing-evidence.png')});
      const note='After shaking, net input work is zero and stored energy decreases as damping dissipates it.';await page.getByRole('textbox',{name:'Scene observation note',exact:true}).fill(note);await page.getByRole('button',{name:'Save scene observation',exact:true}).click();
      const record=await page.evaluate(()=>(window as any).__bucket().seismicTrials[0]);expect(record.prediction).toBe('More damping should dissipate more of the remaining energy.');expect(record.observation).toBe(note);await expect(prediction).toHaveValue('');
      await page.getByRole('button',{name:'Exit fullscreen 3D bridge (Escape)',exact:true}).click();await page.getByRole('button',{name:'Revisit scene observation 1: '+record.name,exact:true}).click();await expect(prediction).toHaveValue(record.prediction);await expect(page.getByRole('textbox',{name:'Scene observation note',exact:true})).toHaveValue(note);
      const fullscreen=page.getByRole('button',{name:'Exit fullscreen 3D bridge (Escape)',exact:true});if(await fullscreen.count())await fullscreen.click();
      await page.getByRole('button',{name:'Open earthquake evidence report',exact:true}).click();const article=page.locator('[data-bridge-print-seismic] [data-seismic-trial]').first();
      await expect(article).toContainText(record.prediction);await expect(article).toContainText(note);const saved=article.locator('[data-investigation-evidence="saved"]');expect(await saved.locator('[data-evidence-value]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-evidence-value')))).toEqual(before);
      await expect(saved.locator('[data-evidence-column]')).toHaveCount(2);await expect(article.locator('button,input,select,textarea')).toHaveCount(0);
      await captureImmersiveRegion(page,saved,'bridge-'+size.width+'-printed-evidence.png',ENHANCEMENT_REPORT);await checkWorkflowHealth(page);
    });
  }
  test('writing evidence: zero input, exact manual endpoints and negative work with reduced motion',async({page})=>{
    await page.emulateMedia({reducedMotion:'reduce'});await mountWorkflow(page,844,{bridgeView:'immersive',bridgeObserver:'bank',seismicEnabled:true,seismicEnergyInterval:true,seismicSceneRecording:true,seismicIntensityG:0});
    const recorder=page.locator('[data-bridge-scene-recorder]'),evidence=recorder.locator('[data-investigation-evidence="scene"]');await page.getByRole('button',{name:'After shaking',exact:true}).click();
    expect(await evidence.locator('[data-evidence-value]').evaluateAll(nodes=>nodes.every(n=>Number(n.getAttribute('data-evidence-value'))===0))).toBe(true);
    await page.getByRole('spinbutton',{name:'Pinned time (s)',exact:true}).fill('17.137');await expect(evidence).toHaveAttribute('data-evidence-start','17.137');await expect(evidence.locator('[data-evidence-question]')).toHaveCount(0);
    await page.getByRole('textbox',{name:'Scene prediction',exact:true}).fill('With no shaking, all transfers stay zero.');
    await page.evaluate(()=>(window as any).__set({seismicIntensityG:0.12}));await page.getByRole('button',{name:'Ground removes energy',exact:true}).click();
    const work=evidence.locator('[data-evidence-row="input"] td');expect(Number(await work.getAttribute('data-evidence-value'))).toBeLessThan(0);await expect(work).toHaveText(/^−/);await expect(work).not.toContainText('<0.001');
    await expect(page.getByRole('textbox',{name:'Scene prediction',exact:true})).toHaveValue('With no shaking, all transfers stay zero.');expect(await page.evaluate(()=>(window as any).__bucket().seismicPlaying)).toBe(false);
    await captureImmersiveRegion(page,evidence,'bridge-844-signed-writing-evidence.png',ENHANCEMENT_REPORT);await checkWorkflowHealth(page);
  });

  for(const size of [{width:1000,height:800},{width:320,height:568}]){
    test('energy interval: paired work budget, pinned orbit and saved evidence at '+size.width+'px',async({page})=>{
      await mountWorkflow(page,size.width,{bridgeView:'immersive',bridgeObserver:'bank',seismicEnabled:true,seismicEnergyInterval:true,seismicIntervalPinS:16.137,seismicEnergyOrbit:true,seismicGuideOpen:true,crossSectionMm2:30000,lateralBraceEvery:1});
      await page.setViewportSize(size);await page.getByRole('button',{name:'Prepare 5% / 20% comparison',exact:true}).click();
      await page.evaluate(()=>(window as any).__set({seismicTime:21.217}));
      const stage=page.locator('[data-allo-fs-stage]');await stage.scrollIntoViewIfNeeded();
      await page.getByRole('button',{name:'Focus scene',exact:true}).click();await page.getByRole('button',{name:'View the 3D bridge fullscreen',exact:true}).click();
      const drawer=page.locator('[data-bridge-scene-drawer]');await drawer.locator('summary').first().press('Enter');
      const interval=page.locator('[data-bridge-energy-interval="scene"]');await interval.scrollIntoViewIfNeeded();
      const values=()=>interval.locator('[data-interval-term]').evaluateAll(nodes=>nodes.map(node=>Number(node.getAttribute('data-interval-value'))));
      const b=await values(),scale=await interval.locator('[data-interval-frame]').getAttribute('data-interval-scale');
      expect(b[0]).toBe(0);expect(b[1]).toBeGreaterThan(0);expect(b[4]).toBeLessThan(0);expect(Math.abs(b[0]-b[1]-b[4])).toBeLessThan(1e-8);
      await expect(interval.locator('[data-interval-window]')).toContainText('16.137–21.217 s');
      await page.getByRole('button',{name:'A · reference',exact:true}).click();expect(await values()).not.toEqual(b);
      await expect(interval.locator('[data-interval-frame]')).toHaveAttribute('data-interval-scale',scale!);await expect(interval.locator('[data-interval-frame]')).toHaveAttribute('data-interval-trial','reference');
      await expect(page.locator('[data-orbit-pin]')).toHaveAttribute('data-orbit-pin-trial','reference');
      const field=page.getByRole('spinbutton',{name:'Pinned time (s)',exact:true});await field.fill('16');
      expect(await page.evaluate(()=>(window as any).__bucket().seismicIntervalPinS)).toBe(16);
      await interval.locator('[data-interval-bars]').evaluate(node=>node.scrollIntoView({block:'start',behavior:'instant'}));
      const bars=await interval.locator('[data-interval-bars]').boundingBox(),heading=await drawer.locator('summary').first().boundingBox();expect(bars!.y).toBeGreaterThanOrEqual(heading!.y+heading!.height);
      expect(await drawer.evaluate(node=>node.scrollWidth-node.clientWidth)).toBeLessThanOrEqual(1);
      await stage.screenshot({path:join(ENHANCEMENT_REPORT,'bridge-'+size.width+'-energy-interval.png')});
      await page.evaluate(()=>(window as any).__set({seismicIntervalPinS:7.217,seismicTime:12.319}));
      await interval.locator('[data-interval-bars]').evaluate(node=>node.scrollIntoView({block:'start',behavior:'instant'}));
      await stage.screenshot({path:join(ENHANCEMENT_REPORT,'bridge-'+size.width+'-driven-interval.png')});
      await inspectWholeOrbit(page);await stage.screenshot({path:join(ENHANCEMENT_REPORT,'bridge-'+size.width+'-pinned-orbit.png')});
      await page.evaluate(()=>(window as any).__set({seismicIntervalPinS:16,seismicTime:21.217}));
      await page.locator('[data-bridge-scene-recorder] > summary').press('Enter');await page.getByRole('textbox',{name:'Scene observation note',exact:true}).fill('After shaking, damping loss equals the decrease in stored energy.');
      await page.getByRole('button',{name:'Save scene observation',exact:true}).click();const saved=await page.evaluate(()=>(window as any).__bucket().seismicTrials[0]);expect(saved.scene.display).toMatchObject({energyInterval:true,intervalPinS:16});
      await page.getByRole('button',{name:'Exit fullscreen 3D bridge (Escape)',exact:true}).click();
      const evidence=await page.locator('[data-seismic-scene-interval]').textContent();
      await page.evaluate(()=>(window as any).__set({seismicIntervalPinS:0,seismicEnergyInterval:false,seismicTime:0,seismicDampingRatio:0.4,bridgeView:'2d'}));
      await page.getByRole('button',{name:'Revisit scene observation 1: Scene observation 1',exact:true}).click();
      expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({seismicEnergyInterval:true,seismicIntervalPinS:16,seismicTime:21.217,seismicSceneTrial:'reference',seismicPlaying:false});
      await page.getByRole('button',{name:'Open earthquake evidence report',exact:true}).click();await expect(page.locator('[data-bridge-print-seismic] [data-seismic-scene-interval]')).toHaveText(evidence!);
      await expect(page.locator('[data-bridge-print-seismic]').locator('button,input,select,textarea')).toHaveCount(0);await checkWorkflowHealth(page);
    });
  }
  test('energy interval: chronological manual inspection and undamped exchange in labelled 2D',async({page})=>{
    await page.emulateMedia({reducedMotion:'reduce'});await mountWorkflow(page,1000,{bridgeView:'3d',seismicEnabled:true,seismicTime:16.419,seismicIntervalPinS:16.137,seismicDampingRatio:0,seismicEnergyInterval:true,seismicEnergyOrbit:true});
    await page.getByRole('button',{name:'Labelled 2D view',exact:true}).click();const interval=page.locator('[data-bridge-energy-interval="fallback"]');
    await expect(interval.locator('[data-interval-insight]')).toContainText('stays constant');
    const terms=await interval.locator('[data-interval-term]').evaluateAll(nodes=>nodes.map(node=>Number(node.getAttribute('data-interval-value'))));expect(terms[0]).toBe(0);expect(terms[1]).toBe(0);expect(Math.abs(terms[2]+terms[3])).toBeLessThan(1e-6);
    await page.getByRole('spinbutton',{name:'Pinned time (s)',exact:true}).fill('20.137');await expect(interval.locator('[data-interval-window]')).toContainText('16.419–20.137 s');
    await page.getByRole('button',{name:'Pin this frame',exact:true}).click();await expect(interval.locator('[data-interval-insight]')).toContainText('Move replay time');
    await page.getByRole('button',{name:'Pin end of shaking',exact:true}).click();await expect(interval.locator('[data-interval-window]')).toContainText('16.000–16.419 s');
    await captureImmersiveRegion(page,interval,'bridge-1000-interval-2d.png',ENHANCEMENT_REPORT);await checkWorkflowHealth(page);
  });
  test('energy interval: landscape zero shaking, keyboard tools and graphics fallback',async({page})=>{
    await page.emulateMedia({reducedMotion:'reduce'});await mountWorkflow(page,844,{bridgeView:'immersive',seismicEnabled:true,seismicTime:20,seismicIntervalPinS:16,seismicIntensityG:0,seismicEnergyInterval:true,seismicSceneFocus:true,seismicReadoutCollapsed:true});
    await page.setViewportSize({width:844,height:390});const stage=page.locator('[data-allo-fs-stage]');await stage.scrollIntoViewIfNeeded();await page.getByRole('button',{name:'View the 3D bridge fullscreen',exact:true}).click();
    const drawer=page.locator('[data-bridge-scene-drawer]'),summary=drawer.locator('summary').first();await summary.press('Enter');const interval=page.locator('[data-bridge-energy-interval="scene"]');
    await expect(interval.locator('[data-interval-insight]')).toContainText('no energy transfer');expect(await interval.locator('[data-interval-term]').evaluateAll(nodes=>nodes.every(n=>Number(n.getAttribute('data-interval-value'))===0))).toBe(true);
    const pin=page.getByRole('spinbutton',{name:'Pinned time (s)',exact:true});await pin.focus();await pin.press('ArrowUp');expect(await page.evaluate(()=>(window as any).__bucket().seismicIntervalPinS)).toBe(16.001);
    await interval.locator('[data-interval-bars]').evaluate(node=>node.scrollIntoView({block:'start',behavior:'instant'}));await stage.screenshot({path:join(ENHANCEMENT_REPORT,'bridge-844-interval-zero.png')});
    await pin.focus();await pin.press('Escape');await expect(drawer).not.toHaveAttribute('open');await expect(summary).toBeFocused();await summary.press('Enter');
    await pin.focus();await page.evaluate(()=>{const canvas=document.querySelector('canvas[data-bridge-gl]') as HTMLCanvasElement;const gl=canvas.getContext('webgl2')||canvas.getContext('webgl');const loss=gl?.getExtension('WEBGL_lose_context');if(!loss)throw Error('No graphics loss extension');loss.loseContext();});
    await expect(page.locator('[data-bridge-elevation]')).toBeFocused();const fallback=page.locator('[data-bridge-energy-interval="fallback"]');await expect(fallback).toHaveAttribute('open','');await expect(fallback.locator('[data-interval-frame]')).toHaveAttribute('data-interval-pin','16.001');await checkWorkflowHealth(page);
  });

  for(const size of [{width:1000,height:800},{width:320,height:568}]){
    test('energy questions: guided A/B investigations, conservation diagram and saved question at '+size.width+'px',async({page})=>{
      await mountWorkflow(page,size.width,{bridgeView:'immersive',bridgeObserver:'bank',seismicEnabled:true,seismicEnergyInterval:true,seismicEnergyOrbit:true,seismicGuideOpen:true,crossSectionMm2:30000,lateralBraceEvery:1});
      await page.setViewportSize(size);await page.getByRole('button',{name:'Prepare 5% / 20% comparison',exact:true}).click();
      const stage=page.locator('[data-allo-fs-stage]');await stage.scrollIntoViewIfNeeded();await page.getByRole('button',{name:'Focus scene',exact:true}).click();await page.getByRole('button',{name:'View the 3D bridge fullscreen',exact:true}).click();
      const drawer=page.locator('[data-bridge-scene-drawer]');await drawer.locator('summary').first().press('Enter');
      const interval=page.locator('[data-bridge-energy-interval="scene"]');
      await page.getByRole('button',{name:'During shaking',exact:true}).click();expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({seismicIntervalPinS:0,seismicTime:16,seismicPlaying:false});
      await expect(interval.locator('[data-energy-question]')).toHaveAttribute('data-energy-question','shaking');
      await page.getByRole('button',{name:'After shaking',exact:true}).click();const scale=await interval.locator('[data-interval-budget]').getAttribute('data-budget-scale');
      await page.getByRole('button',{name:'A · reference',exact:true}).click();await expect(interval.locator('[data-interval-budget]')).toHaveAttribute('data-budget-scale',scale!);await expect(interval.locator('[data-energy-question]')).toHaveAttribute('data-energy-question','settling');
      await page.getByRole('button',{name:'Elastic → kinetic',exact:true}).click();await expect(interval.locator('[data-energy-question]')).toHaveAttribute('data-energy-question','exchange');
      const state=await page.evaluate(()=>(window as any).__bucket());expect(state.seismicIntervalPinS).toBeGreaterThanOrEqual(16);expect(state.seismicTime).toBeGreaterThan(state.seismicIntervalPinS);
      await expect(page.locator('[data-orbit-pin]')).toHaveAttribute('data-orbit-pin',String(state.seismicIntervalPinS));
      await page.getByRole('button',{name:'Ground removes energy',exact:true}).click();await expect(interval.locator('[data-energy-question]')).toHaveAttribute('data-energy-question','returning');
      const values=await interval.locator('[data-budget-part]').evaluateAll(nodes=>Object.fromEntries(nodes.map(n=>[n.getAttribute('data-budget-part'),Number(n.getAttribute('data-budget-value'))])));
      expect(values.returned).toBeGreaterThan(0);expect(values.added).toBe(0);expect(Math.abs(values.initial-values.remaining-values.damping-values.returned)).toBeLessThan(1e-7);
      const removed=interval.locator('[data-budget-legend="returned"]');await expect(removed).toContainText('Net removed by ground');await expect(removed).not.toContainText('<0.001');
      if(values.returned < 0.001) await expect(removed).toContainText(values.returned.toExponential(2));
      const budget=interval.locator('[data-interval-budget]');await budget.evaluate(node=>node.scrollIntoView({block:'start',behavior:'instant'}));
      const b=await budget.boundingBox(),heading=await drawer.locator('summary').first().boundingBox(),d=await drawer.boundingBox();expect(b!.y).toBeGreaterThanOrEqual(heading!.y+heading!.height);expect(b!.y+b!.height).toBeLessThanOrEqual(d!.y+d!.height-6);
      expect(await drawer.evaluate(node=>node.scrollWidth-node.clientWidth)).toBeLessThanOrEqual(1);await stage.screenshot({path:join(ENHANCEMENT_REPORT,'bridge-'+size.width+'-ground-energy-budget.png')});
      await page.getByRole('button',{name:'Elastic → kinetic',exact:true}).click();await interval.locator('[data-energy-questions]').evaluate(node=>node.scrollIntoView({block:'start',behavior:'instant'}));
      await stage.screenshot({path:join(ENHANCEMENT_REPORT,'bridge-'+size.width+'-energy-questions.png')});
      await page.locator('[data-bridge-scene-recorder] > summary').press('Enter');await page.getByRole('button',{name:'Save scene observation',exact:true}).click();
      await page.getByRole('button',{name:'Exit fullscreen 3D bridge (Escape)',exact:true}).click();
      await expect(page.locator('[data-seismic-scene-question]')).toHaveAttribute('data-seismic-scene-question','exchange');
      await page.getByRole('button',{name:'Open earthquake evidence report',exact:true}).click();await expect(page.locator('[data-bridge-print-seismic] [data-seismic-scene-question]')).toHaveAttribute('data-seismic-scene-question','exchange');
      await expect(page.locator('[data-bridge-print-seismic]').locator('button,input,select,textarea')).toHaveCount(0);await checkWorkflowHealth(page);
    });
  }
  test('energy questions: zero shaking and manual intervals in labelled 2D with reduced motion',async({page})=>{
    await page.emulateMedia({reducedMotion:'reduce'});await mountWorkflow(page,844,{bridgeView:'3d',seismicEnabled:true,seismicEnergyInterval:true,seismicIntensityG:0});
    await page.setViewportSize({width:844,height:390});await page.getByRole('button',{name:'Labelled 2D view',exact:true}).click();
    const interval=page.locator('[data-bridge-energy-interval="fallback"]');await expect(page.getByRole('button',{name:'Elastic → kinetic',exact:true})).toBeDisabled();await expect(page.getByRole('button',{name:'Ground removes energy',exact:true})).toBeDisabled();
    await page.getByRole('button',{name:'After shaking',exact:true}).click();await expect(interval.locator('[data-energy-question]')).toHaveAttribute('data-energy-question','settling');
    expect(await interval.locator('[data-budget-part]').evaluateAll(nodes=>nodes.every(n=>Number(n.getAttribute('data-budget-value'))===0))).toBe(true);
    await page.getByRole('spinbutton',{name:'Pinned time (s)',exact:true}).fill('17.137');await expect(interval.locator('[data-energy-question]')).toHaveCount(0);
    expect(await interval.locator('[data-interval-budget]').innerHTML()).not.toMatch(/NaN|Infinity/);await captureImmersiveRegion(page,interval.locator('[data-interval-budget]'),'bridge-844-zero-energy-budget.png',ENHANCEMENT_REPORT);await checkWorkflowHealth(page);
  });

  async function inspectWholeOrbit(page: Page) {
    const plot=page.locator('[data-bridge-energy-orbit="scene"] [data-orbit-plot]');
    await plot.evaluate(node=>node.scrollIntoView({block:'start',behavior:'instant'}));
    const bounds=await plot.evaluate(node=>{
      const drawer=node.closest('[data-bridge-scene-drawer]')!;
      const summary=drawer.querySelector('summary')!;
      const p=node.getBoundingClientRect(),d=drawer.getBoundingClientRect(),s=summary.getBoundingClientRect();
      return {top:p.top,headerBottom:s.bottom,bottom:p.bottom,drawerBottom:d.bottom,height:p.height,width:p.width};
    });
    expect(bounds.top).toBeGreaterThanOrEqual(bounds.headerBottom);
    expect(bounds.bottom).toBeLessThanOrEqual(bounds.drawerBottom-6);
    expect(bounds.height).toBeGreaterThanOrEqual(160);
  }

  for (const width of [1000, 320]) {
    test('orbit interval trail: recorded span, chronological direction and clear endpoints at ' + width + 'px', async ({ page }) => {
      test.setTimeout(480_000);
      const report = process.env.BRIDGE_CAPTURE_REPORT || ENHANCEMENT_REPORT;
      await mkdir(report, { recursive: true });
      const oracle = await loadFrameEnergyOracle();
      await mountWorkflow(page, width, { bridgeView: 'immersive', bridgeObserver: 'bank', bridgeBankYaw: 12, bridgeBankPitch: -5,
        seismicEnabled: true, seismicIntensityG: 0.12, seismicDampingRatio: 0.05, seismicFrequencyHz: 1.1, seismicArchetype: 'stiff',
        seismicTime: 12.319, seismicIntervalPinS: 7.217, seismicEnergyOrbit: false, seismicEnergyInterval: false,
        seismicPlaying: false, autoDriving: false, seismicReadoutCollapsed: false, seismicMotionGuide: false,
        seismicTrialName: 'Orbit span reference', seismicObservation: 'Keep my energy explanation.',
        seismicSceneNote: 'Keep the riverbank observation.', crossSectionMm2: 30000, lateralBraceEvery: 1 });
      await page.getByRole('button', { name: 'Save earthquake trial', exact: true }).click();
      const savedInputs = await page.evaluate(() => (window as any).__bucket().seismicTrials[0].inputs);
      await page.evaluate(() => (window as any).__set({ seismicArchetype: 'flexible', seismicIntensityG: 0.24,
        seismicSceneCompare: true, seismicSceneSource: 'saved', seismicReferenceIndex: 0,
        seismicSceneTrial: 'reference', seismicEnergyOrbit: true }));
      const stage = page.locator('[data-allo-fs-stage]');
      await stage.scrollIntoViewIfNeeded();
      await page.getByRole('button', { name: 'Focus scene', exact: true }).click();
      await page.getByRole('button', { name: 'View the 3D bridge fullscreen', exact: true }).click();
      await checkBridgeCanvasFillsStage(page);
      await page.locator('[data-bridge-scene-drawer] > summary').press('Enter');
      type Scope = 'scene' | 'fallback';
      type Trial = 'reference' | 'current';
      const records: any[] = [], responses = new Map<string, any>();
      const orbit = (scope: Scope) => page.locator('[data-bridge-energy-orbit="' + scope + '"]');
      function response(inputs: GuideInputs) {
        const key = JSON.stringify(Object.keys(inputs).sort().map(name => [name, inputs[name]]));
        if (!responses.has(key)) responses.set(key, oracle.bridgeSeismicResponse(inputs));
        return responses.get(key);
      }
      const xy = (sample: any, selected: any, limit: number) => [
        130 + 87 * (2 * Math.PI * selected.naturalFrequencyHz * sample.relativeM) / limit,
        112 - 87 * sample.velocityMps / limit
      ];
      const parse = (points: string) => points.trim().split(/\s+/).map(pair => pair.split(',').map(Number));
      function closePoints(actual: number[][], expected: number[][], label: string) {
        expect(actual.length, label + ' retains every recorded vertex and both exact endpoints').toBe(expected.length);
        for (let i = 0; i < expected.length; i++) for (let axis = 0; axis < 2; axis++)
          expect(Math.abs(actual[i][axis] - expected[i][axis]), label + ' vertex ' + i + ' axis ' + axis).toBeLessThan(0.00051);
      }
      async function check(scope: Scope, trial: Trial, label: string, pin: number, time: number,
        options: { enabled?: boolean; capture?: boolean } = {}) {
        const enabled = options.enabled !== false;
        await page.evaluate(({ pin, time, enabled }) => (window as any).__set({
          seismicIntervalPinS: pin, seismicTime: time, seismicEnergyInterval: enabled
        }), { pin, time, enabled });
        const target = orbit(scope), frame = target.locator('[data-orbit-frame]');
        await expect(frame).toHaveAttribute('data-orbit-frame', String(time));
        await expect(frame).toHaveAttribute('data-orbit-trial', trial);
        const before = await page.evaluate(() => (window as any).__bucket());
        const currentInputs = await flowCurrentInputs(page);
        const selected = response(trial === 'reference' ? savedInputs : currentInputs);
        const other = scope === 'scene' && before.seismicSceneCompare ? response(trial === 'reference' ? currentInputs : savedInputs) : null;
        const peak = Math.max(selected.peaks.storedJPerKg, other?.peaks.storedJPerKg || 0);
        const limit = peak > 0 ? Math.sqrt(2 * peak) * 1.04 : 1;
        const start = enabled ? Math.min(pin, time) : Math.max(0, time - 1 / selected.naturalFrequencyHz);
        const end = enabled ? Math.max(pin, time) : time;
        // The expected path comes directly from the recorded response. It does
        // not call the orbit chart/trail helper or derive points from DOM hooks.
        const samples = start === end || selected.peaks.storedJPerKg === 0 ? [] : [
          oracle.bridgeSeismicSample(selected, start),
          ...selected.samples.filter((sample: any) => sample.timeS > start && sample.timeS < end),
          oracle.bridgeSeismicSample(selected, end)
        ];
        const points = samples.map((sample: any) => xy(sample, selected, limit));
        const expectedSegments: { opacity: number; points: number[][] }[] = [];
        for (let part = 0; part < 4; part++) {
          const first = Math.floor((points.length - 1) * part / 4), last = Math.floor((points.length - 1) * (part + 1) / 4);
          if (points.length && last > first) expectedSegments.push({ opacity: 0.15 + (part + 1) * 0.1875, points: points.slice(first, last + 1) });
        }
        const cueTime = start + (end - start) * 0.875;
        const tip = xy(oracle.bridgeSeismicSample(selected, cueTime), selected, limit);
        const tail = xy(oracle.bridgeSeismicSample(selected, Math.max(start, cueTime - 1 / 60)), selected, limit);
        const dx = tip[0] - tail[0], dy = tip[1] - tail[1], distance = Math.hypot(dx, dy);
        const arrow = points.length && distance > 0.25 && Math.hypot(tip[0] - 130, tip[1] - 112) > 8 ? [tip,
          [tip[0] - 7 * dx / distance + 3 * dy / distance, tip[1] - 7 * dy / distance - 3 * dx / distance],
          [tip[0] - 7 * dx / distance - 3 * dy / distance, tip[1] - 7 * dy / distance + 3 * dx / distance]
        ] : null;
        const actual = await frame.evaluate(node => {
          const number = (element: Element, name: string) => Number(element.getAttribute(name));
          const paths = (selector: string, kind: string) => [...node.querySelectorAll(selector)].map(path => ({
            tag: path.tagName.toLowerCase(), trial: path.getAttribute(kind), points: path.getAttribute('points')!,
            start: number(path, kind === 'data-orbit-recent' ? 'data-orbit-recent-start' : 'data-orbit-interval-start'),
            end: number(path, kind === 'data-orbit-recent' ? 'data-orbit-recent-end' : 'data-orbit-interval-end'),
            opacity: Number(path.getAttribute('opacity')), stroke: path.getAttribute('stroke'), width: number(path, 'stroke-width')
          }));
          const caption = node.querySelector('[data-orbit-interval-caption]');
          const marker = node.querySelector('[data-orbit-marker="' + node.getAttribute('data-orbit-trial') + '"]')!;
          const pin = node.querySelector('[data-orbit-pin]'), pinSquare = pin?.querySelector('rect');
          const box = node.getBoundingClientRect();
          return { limit: number(node, 'data-orbit-limit'),
            interval: paths('[data-orbit-interval-trail]', 'data-orbit-interval-trail'), recent: paths('[data-orbit-recent]', 'data-orbit-recent'),
            arrow: [...node.querySelectorAll('[data-orbit-direction]')].map(cue => ({ trial: cue.getAttribute('data-orbit-direction'),
              scope: cue.getAttribute('data-orbit-direction-scope'), time: number(cue, 'data-orbit-direction-time'), points: cue.getAttribute('points')! })),
            caption: caption ? { trial: caption.getAttribute('data-orbit-interval-caption'), start: number(caption, 'data-orbit-interval-start'),
              end: number(caption, 'data-orbit-interval-end'), heading: caption.querySelector('strong')?.textContent, text: caption.textContent || '',
              native: !caption.closest('svg,[aria-hidden="true"]') && !!caption.getClientRects().length,
              followsPlot: caption.previousElementSibling?.hasAttribute('data-orbit-plot'), overflow: caption.scrollWidth - caption.clientWidth,
              controls: caption.querySelectorAll('button,input,a,[tabindex="0"]').length } : null,
            recentCaption: node.querySelector('[data-orbit-recent-caption]')?.textContent || null,
            histories: [...node.querySelectorAll('[data-orbit-shaking],[data-orbit-free]')].map(path => path.getAttribute('points')),
            current: { x: number(marker.querySelector('circle')!, 'cx'), y: number(marker.querySelector('circle')!, 'cy') },
            pin: pin && pinSquare ? { time: number(pin, 'data-orbit-pin'), trial: pin.getAttribute('data-orbit-pin-trial'),
              x: number(pinSquare, 'x') + 4, y: number(pinSquare, 'y') + 4 } : null,
            overflow: node.scrollWidth - node.clientWidth, width: box.width
          };
        });
        expect(Math.abs(actual.limit - limit)).toBeLessThanOrEqual(limit * 2e-9);
        const trail = enabled ? actual.interval : actual.recent;
        expect(enabled ? actual.recent : actual.interval).toHaveLength(0);
        expect(trail).toHaveLength(expectedSegments.length);
        for (const [index, segment] of trail.entries()) {
          expect(segment).toMatchObject({ tag: 'polyline', trial, start, end, opacity: expectedSegments[index].opacity,
            stroke: trial === 'reference' ? '#f0abfc' : '#67e8f9', width: 3.2 });
          closePoints(parse(segment.points), expectedSegments[index].points, label + ' trail segment ' + index);
        }
        expect(actual.arrow).toHaveLength(arrow ? 1 : 0);
        if (arrow) {
          expect(actual.arrow[0]).toMatchObject({ trial, scope: enabled ? 'interval' : 'recent', time: cueTime });
          closePoints(parse(actual.arrow[0].points), arrow, label + ' chronological arrow');
          if (enabled && pin > time) expect(actual.arrow[0].time).toBeGreaterThan(time);
        }
        const current = xy(oracle.bridgeSeismicSample(selected, time), selected, limit);
        closePoints([[actual.current.x, actual.current.y]], [current], label + ' inspected marker');
        if (enabled) {
          expect(actual.pin).toMatchObject({ time: pin, trial });
          closePoints([[actual.pin!.x, actual.pin!.y]], [xy(oracle.bridgeSeismicSample(selected, pin), selected, limit)], label + ' pin marker');
          expect(actual.caption).toMatchObject({ trial, start, end, heading: 'Compared interval · ' + start.toFixed(3) + '–' + end.toFixed(3) + ' s',
            native: true, followsPlot: true, controls: 0 });
          expect(actual.caption!.overflow).toBeLessThanOrEqual(1);
          expect(actual.caption!.text).toContain(start === end ? 'The moments coincide; there is no elapsed interval to trace.'
            : selected.peaks.storedJPerKg === 0 ? 'No motion was recorded; the interval still has elapsed time.'
            : 'The trail runs from earlier to later. Repeated cycles can overlap; use the timeline to judge elapsed time.');
          expect(actual.recentCaption).toBeNull();
          await expect(target).not.toContainText('Bright trail: recent motion');
        } else {
          expect(actual.pin).toBeNull(); expect(actual.caption).toBeNull();
          expect(actual.recentCaption).toBe(points.length ? 'Bright trail: recent motion · ' + start.toFixed(3) + '–' + end.toFixed(3) + ' s' : 'No recent motion');
        }
        expect(actual.overflow).toBeLessThanOrEqual(1); expect(actual.width).toBeGreaterThan(200);
        expect(trail.map(path => path.points).join(' ')).not.toMatch(/NaN|Infinity/);
        if (options.capture) {
          // Keep the native width and fonts while fitting the plot and its
          // explanation together. Normal-height layout is checked above.
          const viewport = page.viewportSize()!;
          if (scope === 'scene') {
            await page.getByRole('button', { name: 'Exit fullscreen 3D bridge (Escape)', exact: true }).click();
            await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true);
          }
          await page.setViewportSize({ width, height: Math.max(viewport.height, 1400) });
          if (scope === 'scene') await page.getByRole('button', { name: 'View the 3D bridge fullscreen', exact: true }).click();
          await target.locator('[data-orbit-plot]').evaluate(node => node.scrollIntoView({ block: 'start', behavior: 'instant' }));
          await expect(target.locator('[data-orbit-interval-caption]')).toBeVisible();
          const bounds = await frame.evaluate(node => {
            const plot = node.querySelector('[data-orbit-plot]')!.getBoundingClientRect();
            const caption = node.querySelector('[data-orbit-interval-caption]')!.getBoundingClientRect();
            const panel = node.closest('[data-bridge-scene-readout]')?.getBoundingClientRect();
            return { left: Math.min(plot.left, caption.left), right: Math.max(plot.right, caption.right),
              top: plot.top, bottom: caption.bottom, panelTop: panel?.top, panelBottom: panel?.bottom };
          });
          expect(bounds.top).toBeGreaterThanOrEqual(0); expect(bounds.bottom).toBeLessThanOrEqual(page.viewportSize()!.height);
          if (scope === 'scene') {
            expect(bounds.top).toBeGreaterThanOrEqual(bounds.panelTop!);
            expect(bounds.bottom).toBeLessThanOrEqual(bounds.panelBottom!);
          }
          const x = Math.floor(bounds.left), y = Math.floor(bounds.top);
          await page.screenshot({ path: join(report, 'orbit-span-' + width + '-' + label + '.png'),
            clip: { x, y, width: Math.ceil(bounds.right) - x, height: Math.ceil(bounds.bottom) - y } });
          if (scope === 'scene') {
            await page.getByRole('button', { name: 'Exit fullscreen 3D bridge (Escape)', exact: true }).click();
            await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true);
          }
          await page.setViewportSize(viewport);
          if (scope === 'scene') await page.getByRole('button', { name: 'View the 3D bridge fullscreen', exact: true }).click();
          await expect(frame).toHaveAttribute('data-orbit-frame', String(time));
        }
        expect(await page.evaluate(() => (window as any).__bucket()), 'reading the selected span preserves every experiment field').toEqual(before);
        records.push({ scope, trial, label, pin, time, enabled, before, actual });
        return actual;
      }
      const closed = await check('scene', 'reference', 'closed-before', 7.217, 12.319, { enabled: false });
      const reference = await check('scene', 'reference', 'reference', 7.217, 12.319, { capture: true });
      expect(reference.histories).toEqual(closed.histories); expect(reference.limit).toBe(closed.limit);
      const beforeClose = await page.evaluate(() => (window as any).__bucket());
      const interval = page.locator('[data-bridge-energy-interval="scene"]');
      await interval.locator(':scope > summary').focus();
      await interval.locator(':scope > summary').press('Enter');
      await expect(interval).not.toHaveAttribute('open');
      await expect.poll(() => page.evaluate(() => (window as any).__bucket())).toEqual({ ...beforeClose,
        seismicEnergyInterval: false, seismicPlaying: false, autoDriving: false });
      const restored = await check('scene', 'reference', 'closed-restored', 7.217, 12.319, { enabled: false });
      expect(restored).toEqual(closed);
      await page.getByRole('button', { name: 'B · current', exact: true }).click();
      const current = await check('scene', 'current', 'current', 7.217, 12.319);
      expect(current.histories).toEqual(reference.histories); expect(current.limit).toBe(reference.limit);
      expect(current.interval.map(segment => segment.points)).not.toEqual(reference.interval.map(segment => segment.points));
      const reversed = await check('scene', 'current', 'reversed', 12.319, 7.217, { capture: true });
      expect(reversed.interval).toEqual(current.interval); expect(reversed.arrow).toEqual(current.arrow);
      const cross = await check('scene', 'current', 'across-shaking-end', 12.319, 20.123);
      expect(cross.histories).toEqual(current.histories);
      await check('scene', 'current', 'whole-event', 0, 24);
      await check('scene', 'current', 'free-vibration', 18.123456789, 22.456789);
      await page.evaluate(() => (window as any).__set({ seismicDampingRatio: 0 }));
      await check('scene', 'current', 'undamped-overlap', 16.137, 23.919, { capture: true });
      await page.evaluate(() => (window as any).__set({ seismicDampingRatio: 0.05 }));
      await check('scene', 'current', 'same', 7.217, 7.217, { capture: true });
      await check('scene', 'current', 'tiny-duration', 7.217, 7.217 + 1e-9);
      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 1e-9 }));
      await check('scene', 'current', 'tiny-paired', 7.217, 12.319);
      await page.evaluate(() => (window as any).__set({ seismicSceneCompare: false }));
      const tiny = await check('scene', 'current', 'tiny-unpaired', 7.217, 12.319);
      expect(tiny.interval).toHaveLength(4);
      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 0, seismicSceneCompare: true }));
      await check('scene', 'current', 'zero-paired', 7.217, 12.319, { capture: true });
      await check('scene', 'current', 'zero-same', 7.217, 7.217);
      await page.evaluate(() => (window as any).__set({ seismicSceneCompare: false }));
      const zero = await check('scene', 'current', 'zero-unpaired', 7.217, 12.319);
      expect(zero.limit).toBe(1);
      await page.getByRole('button', { name: 'Exit fullscreen 3D bridge (Escape)', exact: true }).click();
      await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.evaluate(() => (window as any).__set({ bridgeView: '2d', seismicIntensityG: 0.24,
        seismicSceneCompare: true, seismicSceneTrial: 'reference' }));
      await expect(orbit('scene')).toHaveCount(0);
      await check('fallback', 'current', 'fallback-reversed', 20.123, 12.319, { capture: true });
      await check('fallback', 'current', 'fallback-same', 7.217, 7.217);
      await check('fallback', 'current', 'fallback-closed', 7.217, 12.319, { enabled: false });
      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 0 }));
      await check('fallback', 'current', 'fallback-zero', 7.217, 12.319);
      await checkWorkflowHealth(page);
      await writeFile(join(report, 'orbit-span-' + width + '-state.json'), JSON.stringify({ width, records }, null, 2));
    });
  }
  for (const width of [1000, 320]) {
    test('interval timeline: exact energy span, pin and native explanation at ' + width + 'px', async ({ page }) => {
      test.setTimeout(420_000);
      const report = process.env.BRIDGE_CAPTURE_REPORT || ENHANCEMENT_REPORT;
      await mkdir(report, { recursive: true });
      await mountWorkflow(page, width, { bridgeView: 'immersive', bridgeObserver: 'bank', bridgeBankYaw: 12, bridgeBankPitch: -5,
        seismicEnabled: true, seismicIntensityG: 0.12, seismicDampingRatio: 0.05, seismicFrequencyHz: 1.1, seismicArchetype: 'stiff',
        seismicTime: 22.456789, seismicIntervalPinS: 18.123456789, seismicEnergyOrbit: false, seismicEnergyInterval: true,
        seismicPlaying: false, autoDriving: false, seismicReadoutCollapsed: false, seismicMotionGuide: false,
        seismicTrialName: 'Interval timeline reference', seismicObservation: 'Keep the interval and my explanation.',
        crossSectionMm2: 30000, lateralBraceEvery: 1 });
      await page.getByRole('button', { name: 'Save earthquake trial', exact: true }).click();
      await page.evaluate(() => (window as any).__set({ seismicArchetype: 'flexible', seismicIntensityG: 0.24,
        seismicSceneCompare: true, seismicSceneSource: 'saved', seismicReferenceIndex: 0,
        seismicSceneTrial: 'reference', seismicEnergyOrbit: true }));
      const stage = page.locator('[data-allo-fs-stage]');
      await stage.scrollIntoViewIfNeeded();
      await page.getByRole('button', { name: 'Focus scene', exact: true }).click();
      await page.getByRole('button', { name: 'View the 3D bridge fullscreen', exact: true }).click();
      await checkBridgeCanvasFillsStage(page);
      await page.locator('[data-bridge-scene-drawer] > summary').press('Enter');
      type Scope = 'scene' | 'fallback';
      type Trial = 'reference' | 'current';
      const records: any[] = [];
      const orbit = (scope: Scope) => page.locator('[data-bridge-energy-orbit="' + scope + '"]');
      const xAt = (time: number) => 12 + (time - 16) / 8 * 236;
      const numberText = (value: number) => value !== 0 && value < 0.001 ? value.toExponential(2) : value.toFixed(3);
      const explanations = {
        full: 'Shading marks elapsed time in the energy comparison.',
        clipped: 'Only the part within this free-vibration view is shaded.',
        outside: 'This interval falls outside the free-vibration view.',
        same: 'Pin and inspected time coincide; elapsed time is zero.'
      };
      async function check(scope: Scope, trial: Trial, label: string, pin: number, time: number,
        options: { enabled?: boolean; motion?: boolean; capture?: boolean } = {}) {
        const enabled = options.enabled !== false, motion = options.motion !== false;
        await page.evaluate(({ pin, time, enabled }) => (window as any).__set({
          seismicIntervalPinS: pin, seismicTime: time, seismicEnergyInterval: enabled
        }), { pin, time, enabled });
        const before = await page.evaluate(() => (window as any).__bucket());
        const map = orbit(scope).locator('[data-orbit-cycle-map]');
        await expect(map).toHaveAttribute('data-orbit-cycle-map', trial);
        await expect(orbit(scope).locator('[data-orbit-frame]')).toHaveAttribute('data-orbit-frame', String(time));
        await expect(orbit(scope).locator('[data-orbit-frame]')).toHaveAttribute('data-orbit-trial', trial);
        await map.evaluate(node => node.scrollIntoView({ block: 'center', behavior: 'instant' }));
        const actual = await map.evaluate(node => {
          const timeline = node.querySelector('[data-orbit-cycle-timeline]')!;
          const number = (element: Element, name: string) => Number(element.getAttribute(name));
          const box = node.getBoundingClientRect();
          const note = node.querySelector('[data-orbit-cycle-interval-note]');
          const pinCaption = node.querySelector('[data-orbit-cycle-pin-caption]');
          const range = node.querySelector('[data-orbit-cycle-interval-range]');
          return {
            axis: { start: number(timeline, 'data-orbit-cycle-start'), end: number(timeline, 'data-orbit-cycle-end'),
              viewBox: timeline.getAttribute('viewBox'), hidden: timeline.getAttribute('aria-hidden'),
              focusable: timeline.getAttribute('focusable'), ticks: [...timeline.querySelectorAll('text')].map(tick => tick.textContent) },
            intervals: [...timeline.querySelectorAll('[data-orbit-cycle-interval]')].map(span => ({
              tag: span.tagName.toLowerCase(), trial: span.getAttribute('data-orbit-cycle-interval'),
              start: number(span, 'data-orbit-interval-start'), end: number(span, 'data-orbit-interval-end'),
              visibleStart: number(span, 'data-orbit-interval-visible-start'), visibleEnd: number(span, 'data-orbit-interval-visible-end'),
              x: number(span, 'x'), width: number(span, 'width'), y: number(span, 'y'), height: number(span, 'height'),
              fill: getComputedStyle(span).fill, opacity: getComputedStyle(span).opacity
            })),
            pins: [...timeline.querySelectorAll('[data-orbit-cycle-pin]')].map(marker => {
              const line = marker.querySelector('line')!, square = marker.querySelector('rect')!;
              return { tag: marker.tagName.toLowerCase(), time: number(marker, 'data-orbit-cycle-pin'),
                trial: marker.getAttribute('data-orbit-cycle-pin-trial'),
                line: { x1: number(line, 'x1'), x2: number(line, 'x2'), y1: number(line, 'y1'), y2: number(line, 'y2'),
                  dash: line.getAttribute('stroke-dasharray'), stroke: getComputedStyle(line).stroke },
                square: { x: number(square, 'x'), y: number(square, 'y'), width: number(square, 'width'), height: number(square, 'height'),
                  stroke: getComputedStyle(square).stroke } };
            }),
            cursors: [...timeline.querySelectorAll('[data-orbit-cycle-cursor]')].map(cursor => ({
              time: number(cursor, 'data-orbit-cycle-cursor'), x1: number(cursor, 'x1'), x2: number(cursor, 'x2')
            })),
            paintedOrder: [...timeline.querySelectorAll('[data-orbit-cycle-interval],[data-orbit-cycle-cursor],[data-orbit-cycle-pin]')]
              .map(element => element.hasAttribute('data-orbit-cycle-pin') ? 'pin' : element.hasAttribute('data-orbit-cycle-cursor') ? 'cursor' : 'interval'),
            markerCount: timeline.querySelectorAll('[data-orbit-cycle-marker]').length,
            note: note ? { trial: note.getAttribute('data-orbit-cycle-interval-note'), status: note.getAttribute('data-orbit-interval-status'),
              text: note.textContent, range: range?.textContent, pin: pinCaption?.textContent,
              native: !note.closest('svg,[aria-hidden="true"]') && !!note.getClientRects().length,
              pinSymbolHidden: !!pinCaption?.querySelector('[aria-hidden="true"]') } : null,
            controls: node.querySelectorAll('button,a,input,[tabindex="0"]').length,
            layout: { width: box.width, overflow: node.scrollWidth - node.clientWidth,
              outside: [...node.querySelectorAll('*')].filter(element => !element.closest('svg')).some(element => {
                const child = element.getBoundingClientRect();
                return child.width > 0 && (child.left < box.left - 1 || child.right > box.right + 1);
              }) }
          };
        });
        expect(actual.axis).toEqual({ start: 16, end: 24, viewBox: '0 0 260 180', hidden: 'true', focusable: 'false',
          ticks: ['16 s', '18 s', '20 s', '22 s', '24 s'] });
        const start = Math.min(pin, time), end = Math.max(pin, time), visibleStart = Math.max(16, start), visibleEnd = Math.min(24, end);
        const positiveOverlap = visibleEnd > visibleStart;
        if (enabled && positiveOverlap) {
          expect(actual.intervals).toHaveLength(1);
          const span = actual.intervals[0];
          expect(span).toMatchObject({ tag: 'rect', trial, start, end, visibleStart, visibleEnd, y: 8, height: 136 });
          expect(span.x).toBeCloseTo(xAt(visibleStart), 10);
          const expectedWidth = (visibleEnd - visibleStart) / 8 * 236;
          expect(span.width).toBeGreaterThan(0);
          expect(Math.abs(span.width - expectedWidth)).toBeLessThanOrEqual(expectedWidth * 1e-12);
          expect(span.fill).not.toBe('none'); expect(Number(span.opacity)).toBeGreaterThan(0);
          expect(actual.paintedOrder[0]).toBe('interval');
        } else expect(actual.intervals).toHaveLength(0);
        if (enabled && pin >= 16 && pin <= 24) {
          expect(actual.pins).toHaveLength(1);
          const marker = actual.pins[0];
          expect(marker).toMatchObject({ tag: 'g', time: pin, trial, line: { y1: 8, y2: 152 }, square: { y: 2, width: 6, height: 6 } });
          expect(marker.line.x1).toBeCloseTo(xAt(pin), 10); expect(marker.line.x2).toBeCloseTo(xAt(pin), 10);
          expect(marker.square.x).toBeCloseTo(xAt(pin) - 3, 10);
          expect(marker.line.dash).toBeTruthy(); expect(marker.line.dash).not.toBe('none');
          expect(marker.line.stroke).not.toBe('none'); expect(marker.square.stroke).not.toBe('none');
          expect(actual.paintedOrder.at(-1)).toBe('pin');
        } else expect(actual.pins).toHaveLength(0);
        if ((motion || enabled) && time >= 16 && time <= 24) {
          expect(actual.cursors).toHaveLength(1);
          expect(actual.cursors[0].time).toBe(time);
          expect(actual.cursors[0].x1).toBeCloseTo(xAt(time), 10);
          expect(actual.cursors[0].x2).toBeCloseTo(xAt(time), 10);
        } else expect(actual.cursors).toHaveLength(0);
        if (enabled) {
          const status = pin === time ? 'same' : positiveOverlap ? start >= 16 && end <= 24 ? 'full' : 'clipped' : 'outside';
          const pinInside = pin >= 16 && pin <= 24;
          expect(actual.note).toMatchObject({ trial, status, native: true, pinSymbolHidden: pinInside,
            range: 'Energy comparison interval · ' + start.toFixed(3) + '–' + end.toFixed(3) + ' s · ' + numberText(end - start) + ' s',
            pin: (pinInside ? '□ ' : '') + 'Pin · ' + pin.toFixed(3) + ' s' + (pinInside ? '' : ' · Outside this view') });
          expect(actual.note!.text).toContain(explanations[status]);
          if (end > start && end - start < 0.001) expect(actual.note!.range).toMatch(/ · [1-9]\.[0-9]{2}e-\d+ s$/);
        } else expect(actual.note).toBeNull();
        if (motion) expect(actual.markerCount).toBeGreaterThan(0); else {
          expect(actual.markerCount).toBe(0);
          await expect(map.locator('[data-orbit-cycle-map-empty]')).toHaveText('No cycle moments recorded.');
        }
        expect(actual.controls).toBe(0);
        expect(actual.layout.width).toBeGreaterThan(200);
        expect(actual.layout.overflow).toBeLessThanOrEqual(1); expect(actual.layout.outside).toBe(false);
        if (options.capture) {
          await map.screenshot({ path: join(report, 'interval-timeline-' + width + '-' + label + '-map.png') });
        }
        const after = await page.evaluate(() => (window as any).__bucket());
        expect(after, 'reading, scrolling and capturing interval evidence never changes any experiment state').toEqual(before);
        records.push({ scope, trial, label, pin, time, enabled, motion, before, after, actual });
      }
      await check('scene', 'reference', 'reference', 18.123456789, 22.456789, { capture: true });
      await page.getByRole('button', { name: 'B · current', exact: true }).click();
      await check('scene', 'current', 'current', 18.123456789, 22.456789);
      await check('scene', 'current', 'reversed', 22.456789, 18.123456789);
      await check('scene', 'current', 'whole-view', 16, 24);
      await check('scene', 'current', 'whole-view-reversed', 24, 16);
      await check('scene', 'current', 'clipped-pin', 3.14159, 20.123, { capture: true });
      await check('scene', 'current', 'clipped-frame', 20.123, 3.14159);
      await check('scene', 'current', 'before-view', 3.14159, 15.999, { capture: true });
      await check('scene', 'current', 'frame-at-start', 15.999, 16);
      await check('scene', 'current', 'pin-at-start', 16, 15.999);
      await check('scene', 'current', 'same', 20.123, 20.123, { capture: true });
      await check('scene', 'current', 'same-before-view', 15.999, 15.999);
      await check('scene', 'current', 'tiny-duration', 20.123, 20.123 + 1e-9);
      await check('scene', 'current', 'closed', 18.123456789, 22.456789, { enabled: false });
      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 1e-9 }));
      await check('scene', 'current', 'tiny-motion', 18.123456789, 22.456789);
      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 0 }));
      await check('scene', 'current', 'zero-motion', 18.123456789, 22.456789, { motion: false, capture: true });
      await check('scene', 'current', 'zero-closed', 18.123456789, 22.456789, { motion: false, enabled: false });
      await page.getByRole('button', { name: 'Exit fullscreen 3D bridge (Escape)', exact: true }).click();
      await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.evaluate(() => (window as any).__set({ bridgeView: '2d', seismicIntensityG: 0.24 }));
      await expect(orbit('scene')).toHaveCount(0);
      await check('fallback', 'current', 'fallback-reversed', 22.456789, 18.123456789);
      await check('fallback', 'current', 'fallback-clipped', 3.14159, 20.123, { capture: true });
      await check('fallback', 'current', 'fallback-same', 20.123, 20.123);
      await check('fallback', 'current', 'fallback-closed', 18.123456789, 22.456789, { enabled: false });
      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 0 }));
      await check('fallback', 'current', 'fallback-zero', 18.123456789, 22.456789, { motion: false });
      await checkWorkflowHealth(page);
      await writeFile(join(report, 'interval-timeline-' + width + '-state.json'), JSON.stringify({ width, records }, null, 2));
    });
  }
  for (const width of [1000, 320]) {
    test('cycle energy handoff: selected motion, exact interval and reciprocal focus at ' + width + 'px', async ({ page }) => {
      test.setTimeout(480_000);
      const report = process.env.BRIDGE_CAPTURE_REPORT || ENHANCEMENT_REPORT;
      await mkdir(report, { recursive: true });
      const oracle = await loadFrameEnergyOracle();
      await mountWorkflow(page, width, { bridgeView: 'immersive', bridgeObserver: 'bank', bridgeBankYaw: 12, bridgeBankPitch: -5,
        seismicEnabled: true, seismicIntensityG: 0.12, seismicDampingRatio: 0.05, seismicFrequencyHz: 1.1, seismicArchetype: 'stiff',
        seismicTime: 20.123, seismicEnergyOrbit: false, seismicEnergyInterval: false, seismicPlaying: false, autoDriving: false,
        seismicReadoutCollapsed: false, seismicMotionGuide: false, seismicIntervalPinS: 3.14159,
        seismicTrialName: 'Cycle energy reference', seismicObservation: 'Keep my interval explanation.',
        crossSectionMm2: 30000, lateralBraceEvery: 1 });
      await page.getByRole('button', { name: 'Save earthquake trial', exact: true }).click();
      const savedInputs = await page.evaluate(() => (window as any).__bucket().seismicTrials[0].inputs);
      await page.evaluate(() => (window as any).__set({ seismicArchetype: 'flexible', seismicIntensityG: 0.24,
        seismicSceneCompare: true, seismicSceneSource: 'saved', seismicReferenceIndex: 0,
        seismicSceneTrial: 'reference', seismicEnergyOrbit: true }));
      const currentInputs = await flowCurrentInputs(page);
      const stage = page.locator('[data-allo-fs-stage]');
      await stage.scrollIntoViewIfNeeded();
      await page.getByRole('button', { name: 'Focus scene', exact: true }).click();
      await page.getByRole('button', { name: 'View the 3D bridge fullscreen', exact: true }).click();
      await checkBridgeCanvasFillsStage(page);
      await page.locator('[data-bridge-scene-drawer] > summary').press('Enter');
      type Scope = 'scene' | 'fallback';
      type Root = { kind: 'turning' | 'crossing'; time: number };
      const responses = new Map<string, any>(), records: any[] = [], disabled: any[] = [];
      function response(inputs: GuideInputs) {
        const key = JSON.stringify(inputs);
        if (!responses.has(key)) responses.set(key, oracle.bridgeSeismicResponse(inputs));
        return responses.get(key);
      }
      function roots(inputs: GuideInputs): Root[] {
        const samples = response(inputs).samples, result: Root[] = [];
        // Expectations come from physical samples, never the orbit's chart helper or target attributes.
        for (const [kind, field] of [['turning', 'velocityMps'], ['crossing', 'relativeM']] as const) {
          for (let index = 1; index < samples.length; index++) {
            const a = samples[index - 1], b = samples[index];
            if (a.timeS < 16 - 1e-9 || a[field] === 0 && b[field] === 0 || Math.sign(a[field]) === Math.sign(b[field])) continue;
            const time = a[field] === 0 ? a.timeS : b[field] === 0 ? b.timeS
              : a.timeS + (b.timeS - a.timeS) * Math.abs(a[field]) / (Math.abs(a[field]) + Math.abs(b[field]));
            if (!result.some(root => root.kind === kind && Math.abs(root.time - time) < 1e-7)) result.push({ kind, time });
          }
        }
        return result.sort((a, b) => a.time - b.time);
      }
      const previous = (inputs: GuideInputs, time: number) => roots(inputs).filter(root => root.time < time - 1e-7).at(-1);
      const orbit = (scope: Scope) => page.locator('[data-bridge-energy-orbit="' + scope + '"]');
      const interval = (scope: Scope) => page.locator('[data-bridge-energy-interval="' + scope + '"]');
      async function checkEntry(scope: Scope, inputs: GuideInputs, trial: 'reference' | 'current') {
        const time = await page.evaluate(() => (window as any).__bucket().seismicTime), expected = previous(inputs, time);
        const button = orbit(scope).locator('[data-orbit-energy-jump]');
        await expect(button).toHaveAttribute('type', 'button');
        await expect(button).toHaveAccessibleName('Compare energy since previous cycle moment');
        await expect(button).toHaveAttribute('aria-controls', 'bridge-' + scope + '-energy-interval');
        await expect(button).toHaveAttribute('aria-describedby', 'bridge-orbit-energy-' + scope);
        await expect(orbit(scope).locator('[data-orbit-frame]')).toHaveAttribute('data-orbit-trial', trial);
        const description = page.locator('#bridge-orbit-energy-' + scope);
        const rawTarget = await button.getAttribute('data-orbit-energy-start');
        const target = rawTarget === null ? undefined : Number(rawTarget);
        await expect(description).toHaveCount(1);
        expect(await description.evaluate(node => !!node.getClientRects().length && !node.closest('svg,[aria-hidden="true"]'))).toBe(true);
        if (expected) {
          await expect(button).toBeEnabled();
          expect(Math.abs(target! - expected.time)).toBeLessThan(1e-9);
          await expect(button).toHaveAttribute('data-orbit-energy-origin', expected.kind);
          await expect(description).toContainText(expected.kind === 'turning' ? 'Turning point' : 'Center crossing');
          await expect(description).toContainText(expected.time.toFixed(3) + ' s');
          await expect(description).toContainText(time.toFixed(3) + ' s');
          await expect(description).toContainText('Replaces the pin; keeps this frame.');
        } else {
          await expect(button).toBeDisabled();
          await expect(button).not.toHaveAttribute('data-orbit-energy-start');
          await expect(button).not.toHaveAttribute('data-orbit-energy-origin');
          await expect(description).toHaveText(roots(inputs).length ? 'No earlier cycle moment. Step forward to compare energy.' : 'No cycle moments recorded.');
        }
        const layout = await button.evaluate(node => ({ height: node.getBoundingClientRect().height,
          overflow: node.scrollWidth - node.clientWidth }));
        expect(layout.height).toBeGreaterThanOrEqual(44);
        expect(layout.overflow).toBeLessThanOrEqual(1);
        expect(await description.evaluate(node => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1);
        return { expected, target, time, layout };
      }
      async function focusBounds(scope: Scope, target: ReturnType<typeof interval>) {
        const summary = target.locator(':scope > summary');
        await expect(summary).toBeFocused();
        const box = await summary.evaluate(node => {
          const rect = node.getBoundingClientRect(), drawer = node.closest('[data-bridge-scene-readout]');
          const sticky = drawer?.querySelector(':scope > summary')?.getBoundingClientRect();
          return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, height: innerHeight,
            viewport: document.documentElement.clientWidth, header: sticky?.bottom,
            drawerBottom: drawer?.getBoundingClientRect().bottom, margin: getComputedStyle(node).scrollMarginTop };
        });
        expect(box.top).toBeGreaterThanOrEqual(scope === 'scene' ? box.header! - 1 : -1);
        expect(box.bottom).toBeLessThanOrEqual(Math.min(box.height, box.drawerBottom ?? box.height) + 1);
        expect(box.left).toBeGreaterThanOrEqual(-1); expect(box.right).toBeLessThanOrEqual(box.viewport + 1);
        expect(box.margin).toBe('44px');
        return box;
      }
      async function capture(scope: Scope, suffix: string) {
        const file = join(report, 'cycle-energy-' + width + '-' + suffix + '.png');
        if (scope === 'scene') await stage.screenshot({ path: file }); else await page.screenshot({ path: file });
      }
      async function handoff(scope: Scope, inputs: GuideInputs, trial: 'reference' | 'current', key: 'Enter' | 'Space', suffix?: string) {
        const entry = await checkEntry(scope, inputs, trial);
        expect(entry.expected).toBeTruthy();
        const button = orbit(scope).locator('[data-orbit-energy-jump]');
        await button.evaluate(node => node.scrollIntoView({ block: 'center', behavior: 'instant' }));
        if (suffix) await capture(scope, suffix + '-entry');
        const before = await page.evaluate(() => (window as any).__bucket());
        await button.focus(); await button.press(key);
        const target = interval(scope), summary = target.locator(':scope > summary');
        await expect(target).toHaveAttribute('open', '');
        const after = await page.evaluate(() => (window as any).__bucket());
        expect(after, 'the handoff replaces only the pin, opens energy, and pauses animation').toEqual({ ...before,
          seismicIntervalPinS: entry.target!, seismicEnergyInterval: true, seismicPlaying: false, autoDriving: false });
        const geometry = await focusBounds(scope, target);
        const frame = target.locator('[data-interval-frame]');
        await expect(frame).toHaveAttribute('data-interval-frame', String(before.seismicTime));
        await expect(frame).toHaveAttribute('data-interval-pin', String(entry.target!));
        await expect(frame).toHaveAttribute('data-interval-trial', trial);
        await expect(target.locator('[data-interval-window]')).toHaveAttribute('data-interval-start', String(entry.target!));
        await expect(target.locator('[data-interval-window]')).toHaveAttribute('data-interval-end', String(before.seismicTime));
        // Differences of independently sampled energy history are the interval oracle.
        const early = oracle.bridgeSeismicSample(response(inputs), entry.target!);
        const late = oracle.bridgeSeismicSample(response(inputs), before.seismicTime);
        const expectedTerms: Record<string, number> = { input: late.inputJPerKg - early.inputJPerKg,
          damping: late.dissipatedJPerKg - early.dissipatedJPerKg, kinetic: late.kineticJPerKg - early.kineticJPerKg,
          elastic: late.strainJPerKg - early.strainJPerKg, stored: late.storedJPerKg - early.storedJPerKg };
        const terms = await target.locator('[data-interval-term]').evaluateAll(nodes => Object.fromEntries(nodes.map(node =>
          [node.getAttribute('data-interval-term')!, Number(node.getAttribute('data-interval-value'))])));
        expect(Object.keys(terms).sort()).toEqual(Object.keys(expectedTerms).sort());
        for (const [name, value] of Object.entries(expectedTerms)) {
          if (value === 0) expect(terms[name]).toBe(0);
          else expect(Math.abs(terms[name] - value)).toBeLessThanOrEqual(Math.abs(value) * 2e-9);
        }
        await expect(target.locator('[data-interval-insight]')).toContainText('After shaking, input work is zero.');
        expect(await target.evaluate(node => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1);
        if (suffix) {
          await capture(scope, suffix + '-focused');
          const bars = target.locator('[data-interval-bars]');
          await bars.evaluate(node => node.scrollIntoView({ block: 'center', behavior: 'instant' }));
          await expect(bars).toContainText(entry.target!.toFixed(3) + ' s');
          await expect(bars).toContainText(before.seismicTime.toFixed(3) + ' s');
          const visibleBars = await bars.evaluate(node => {
            const box = node.getBoundingClientRect(), drawer = node.closest('[data-bridge-scene-readout]');
            return { top: box.top, bottom: box.bottom, height: innerHeight,
              header: drawer?.querySelector(':scope > summary')?.getBoundingClientRect().bottom,
              drawerBottom: drawer?.getBoundingClientRect().bottom };
          });
          expect(visibleBars.top).toBeGreaterThanOrEqual(visibleBars.header ?? 0);
          expect(visibleBars.bottom).toBeLessThanOrEqual(Math.min(visibleBars.height, visibleBars.drawerBottom ?? visibleBars.height));
          await bars.screenshot({ path: join(report, 'cycle-energy-' + width + '-' + suffix + '-bars.png') });
        }
        const back = target.getByRole('button', { name: 'View motion on the energy orbit', exact: true });
        await expect(back).toHaveAttribute('data-bridge-evidence-jump', 'orbit');
        await expect(back).toHaveAttribute('aria-controls', 'bridge-energy-orbit-' + scope);
        await back.focus(); await back.press(key === 'Enter' ? 'Space' : 'Enter');
        const returned = await page.evaluate(() => (window as any).__bucket());
        expect(returned).toEqual({ ...after, seismicEnergyOrbit: true, seismicPlaying: false, autoDriving: false });
        await focusBounds(scope, orbit(scope));
        await expect(orbit(scope).locator('[data-orbit-frame]')).toHaveAttribute('data-orbit-frame', String(before.seismicTime));
        await expect(orbit(scope).locator('[data-orbit-pin]')).toHaveAttribute('data-orbit-pin', String(entry.target!));
        await expect(orbit(scope).locator('[data-orbit-pin]')).toHaveAttribute('data-orbit-pin-trial', trial);
        await orbit(scope).locator(':scope > summary').focus();
        await page.keyboard.press('Tab');
        await page.evaluate(() => { (window as any).__cycleEnergyFocus = document.activeElement;
          (window as any).__set({ seismicObservation: (window as any).__bucket().seismicObservation }); });
        await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
        expect(await page.evaluate(() => document.activeElement === (window as any).__cycleEnergyFocus)).toBe(true);
        expect(await page.evaluate(() => (window as any).__bucket().seismicTime)).toBe(before.seismicTime);
        records.push({ scope, trial, key, entry, before, after, returned, terms, expectedTerms, geometry });
      }
      async function disabledAt(inputs: GuideInputs, time: number) {
        await page.evaluate(time => (window as any).__set({ seismicTime: time }), time);
        const entry = await checkEntry('scene', inputs, 'current');
        expect(entry.expected).toBeUndefined();
        const before = await page.evaluate(() => (window as any).__bucket());
        await orbit('scene').locator('[data-orbit-energy-jump]').evaluate(node => (node as HTMLButtonElement).click());
        expect(await page.evaluate(() => (window as any).__bucket())).toEqual(before);
        disabled.push({ time, entry, before });
      }
      const aPrevious = previous(savedInputs, 20.123), bPrevious = previous(currentInputs, 20.123);
      expect(aPrevious!.time).not.toBe(bPrevious!.time);
      await handoff('scene', savedInputs, 'reference', 'Enter', 'reference');
      await page.getByRole('button', { name: 'B · current', exact: true }).click();
      for (const kind of ['turning', 'crossing'] as const) {
        const moment = roots(currentInputs).find(root => root.kind === kind && root.time > 20)!;
        await page.evaluate(time => (window as any).__set({ seismicTime: time }), moment.time);
        await handoff('scene', currentInputs, 'current', kind === 'turning' ? 'Space' : 'Enter');
      }
      await page.evaluate(() => (window as any).__set({ seismicTime: 24 }));
      await handoff('scene', currentInputs, 'current', 'Space');
      const first = roots(currentInputs)[0].time;
      for (const time of [0, 15.999, 16, first, first + 0.5e-7]) await disabledAt(currentInputs, time);
      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 1e-9, seismicTime: 20.123 }));
      const tinyInputs = await flowCurrentInputs(page);
      await handoff('scene', tinyInputs, 'current', 'Enter');
      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 0 }));
      const zeroInputs = await flowCurrentInputs(page);
      await disabledAt(zeroInputs, 20.123);
      await expect(orbit('scene').locator('[data-orbit-frame]')).toHaveAttribute('data-orbit-active-scale', 'true');
      await page.getByRole('button', { name: 'Exit fullscreen 3D bridge (Escape)', exact: true }).click();
      await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.evaluate(() => (window as any).__set({ bridgeView: '2d', seismicIntensityG: 0.24, seismicTime: 24 }));
      await expect(orbit('scene')).toHaveCount(0);
      await handoff('fallback', currentInputs, 'current', 'Space', 'fallback');
      await checkWorkflowHealth(page);
      await writeFile(join(report, 'cycle-energy-' + width + '-state.json'), JSON.stringify({ width,
        independentRoots: { reference: roots(savedInputs), current: roots(currentInputs) }, records, disabled }, null, 2));
    });
  }
  for (const width of [1000, 320]) {
    test('orbit cycle navigation: previous and next moments preserve evidence at ' + width + 'px', async ({ page }) => {
      test.setTimeout(420_000);
      const report = process.env.BRIDGE_CAPTURE_REPORT || ENHANCEMENT_REPORT;
      await mkdir(report, { recursive: true });
      const oracle = await loadFrameEnergyOracle();
      await mountWorkflow(page, width, { bridgeView: 'immersive', bridgeObserver: 'bank', seismicEnabled: true,
        seismicIntensityG: 0.12, seismicDampingRatio: 0.05, seismicFrequencyHz: 1.1, seismicArchetype: 'stiff',
        seismicTime: 24, seismicEnergyOrbit: false, seismicPlaying: false, autoDriving: false,
        seismicReadoutCollapsed: false, seismicMotionGuide: false, seismicIntervalPinS: 3.14159,
        seismicTrialName: 'Cycle reference', seismicObservation: 'Keep the model, viewpoint and pinned frame.',
        crossSectionMm2: 30000, lateralBraceEvery: 1 });
      await page.getByRole('button', { name: 'Save earthquake trial', exact: true }).click();
      const savedInputs = await page.evaluate(() => (window as any).__bucket().seismicTrials[0].inputs);
      await page.evaluate(() => (window as any).__set({ seismicArchetype: 'flexible', seismicIntensityG: 0.24,
        seismicSceneCompare: true, seismicSceneSource: 'saved', seismicReferenceIndex: 0,
        seismicSceneTrial: 'reference', seismicEnergyOrbit: true }));
      const currentInputs = await flowCurrentInputs(page);
      const stage = page.locator('[data-allo-fs-stage]');
      await stage.scrollIntoViewIfNeeded();
      await page.getByRole('button', { name: 'Focus scene', exact: true }).click();
      await page.getByRole('button', { name: 'View the 3D bridge fullscreen', exact: true }).click();
      await checkBridgeCanvasFillsStage(page);
      await page.locator('[data-bridge-scene-drawer] > summary').press('Enter');
      type CycleKind = 'turning' | 'crossing';
      type CycleStep = 'previous' | 'next';
      const order: [CycleStep, CycleKind][] = [['previous', 'turning'], ['next', 'turning'], ['previous', 'crossing'], ['next', 'crossing']];
      const responses = new Map<string, any>();
      const records: any[] = [];
      const timelineChecks: any[] = [];
      function cycleRoots(inputs: GuideInputs) {
        const key = JSON.stringify(inputs);
        if (!responses.has(key)) responses.set(key, oracle.bridgeSeismicResponse(inputs));
        const response = responses.get(key), roots: Record<CycleKind, number[]> = { turning: [], crossing: [] };
        // Derive zeros from physical samples; no chart helper or DOM time supplies the expectation.
        for (const [kind, field] of [['turning', 'velocityMps'], ['crossing', 'relativeM']] as const) {
          for (let index = 1; index < response.samples.length; index++) {
            const a = response.samples[index - 1], b = response.samples[index];
            if (a.timeS < 16 - 1e-9 || a[field] === 0 && b[field] === 0) continue;
            if (Math.sign(a[field]) === Math.sign(b[field])) continue;
            const time = a[field] === 0 ? a.timeS : b[field] === 0 ? b.timeS
              : a.timeS + (b.timeS - a.timeS) * Math.abs(a[field]) / (Math.abs(a[field]) + Math.abs(b[field]));
            if (!roots[kind].some(previous => Math.abs(previous - time) < 1e-7)) roots[kind].push(time);
          }
        }
        return roots;
      }
      const aRoots = cycleRoots(savedInputs), bRoots = cycleRoots(currentInputs);
      expect(aRoots.turning.length).toBeGreaterThan(3);
      expect(bRoots.turning.length).toBeGreaterThan(3);
      expect(Math.abs(aRoots.turning.at(-1)! - bRoots.turning.at(-1)!)).toBeGreaterThan(0.001);
      const orbit = (scope: 'scene' | 'fallback') => page.locator('[data-bridge-energy-orbit="' + scope + '"]');
      async function checkTimeline(scope: 'scene' | 'fallback', inputs: GuideInputs, trial: 'reference' | 'current', time: number) {
        const map = orbit(scope).locator('[data-orbit-cycle-map]');
        await expect(map).toHaveCount(1);
        await expect(map).toHaveAttribute('data-orbit-cycle-map', trial);
        await expect(map).toContainText('Free-vibration moments');
        await expect(map).toContainText('Turning points');
        await expect(map).toContainText('Center crossings');
        await expect(map).toContainText('Tap the blue row for a turning point or the gold row for a center crossing. The nearest moment is selected. For keyboard access, use the previous/next buttons below. The white line marks the inspected time.');
        const status = map.locator('[data-orbit-cycle-map-status]');
        await expect(status).toContainText(scope === 'fallback' ? 'Current experiment' : trial === 'reference' ? 'A · reference' : 'B · current');
        await expect(status).toContainText(time.toFixed(3) + ' s');
        await expect(status).toContainText(time < 16 ? 'Before free vibration' : 'Free vibration');
        expect(await status.evaluate(node => !node.closest('svg,[aria-hidden="true"]'))).toBe(true);
        const timeline = map.locator('[data-orbit-cycle-timeline]');
        await expect(timeline).toHaveAttribute('aria-hidden', 'true');
        await expect(timeline).toHaveAttribute('focusable', 'false');
        await expect(timeline).toHaveAttribute('viewBox', '0 0 260 180');
        await expect(timeline).toHaveAttribute('data-orbit-cycle-start', '16');
        await expect(timeline).toHaveAttribute('data-orbit-cycle-end', '24');
        await expect(map.locator('button,a,input,[tabindex="0"]')).toHaveCount(0);
        const actual = await timeline.evaluate(node => {
          const number = (element: Element, attribute: string) => Number(element.getAttribute(attribute));
          return {
            markers: [...node.querySelectorAll('[data-orbit-cycle-marker]')].map(marker => {
              const shape = marker.matches('circle,path,polygon') ? marker : [...marker.querySelectorAll('circle,path,polygon')].at(-1)!;
              const box = (shape as SVGGraphicsElement).getBBox();
              return { kind: marker.getAttribute('data-orbit-cycle-marker'), time: number(marker, 'data-orbit-cycle-time'),
                selected: marker.getAttribute('data-orbit-cycle-selected'), shape: shape.tagName.toLowerCase(),
                x: box.x + box.width / 2, y: box.y + box.height / 2,
                radius: shape.tagName.toLowerCase() === 'circle' ? number(shape, 'r') : null };
            }),
            cursors: [...node.querySelectorAll('[data-orbit-cycle-cursor]')].map(cursor => ({
              time: number(cursor, 'data-orbit-cycle-cursor'), x1: number(cursor, 'x1'), x2: number(cursor, 'x2')
            }))
          };
        });
        const roots = cycleRoots(inputs), expectedMarkers = (['turning', 'crossing'] as CycleKind[])
          .flatMap(kind => roots[kind].map(root => ({ kind, time: root })));
        expect(actual.markers).toHaveLength(expectedMarkers.length);
        for (const expected of expectedMarkers) {
          const marker = actual.markers.find(candidate => candidate.kind === expected.kind && Math.abs(candidate.time - expected.time) < 1e-9);
          expect(marker, 'every selected-trial root appears in the correct timeline lane').toBeTruthy();
          expect(marker!.x).toBeCloseTo(12 + (expected.time - 16) / 8 * 236, 4);
          expect(marker!.y).toBeCloseTo(expected.kind === 'turning' ? 42 : 110, 4);
          expect(marker!.selected).toBe(String(Math.abs(expected.time - time) < 1e-7));
          if (expected.kind === 'turning') {
            expect(marker!.shape).toBe('circle'); expect(marker!.radius).toBe(3.2);
          } else expect(['path', 'polygon']).toContain(marker!.shape);
        }
        if (expectedMarkers.length && time >= 16) {
          expect(actual.cursors).toHaveLength(1);
          expect(actual.cursors[0].time).toBe(time);
          expect(actual.cursors[0].x1).toBeCloseTo(12 + (time - 16) / 8 * 236, 6);
          expect(actual.cursors[0].x2).toBeCloseTo(actual.cursors[0].x1, 8);
        } else expect(actual.cursors).toHaveLength(0);
        if (!expectedMarkers.length) await expect(map.locator('[data-orbit-cycle-map-empty]')).toHaveText('No cycle moments recorded.');
        else await expect(map.locator('[data-orbit-cycle-map-empty]')).toHaveCount(0);
        const layout = await map.evaluate(node => {
          const box = node.getBoundingClientRect();
          return { overflow: node.scrollWidth - node.clientWidth, width: box.width,
            legendsNative: ['Turning points', 'Center crossings'].every(label => [...node.querySelectorAll('*')]
              .some(element => element.textContent?.trim().replace(/^[○◇]\s*/, '') === label && !element.closest('svg,[aria-hidden="true"]'))),
            outside: [...node.querySelectorAll('*')].filter(element => !element.closest('svg')).some(element => {
              const child = element.getBoundingClientRect();
              return child.width > 0 && (child.left < box.left - 1 || child.right > box.right + 1);
            }) };
        });
        expect(layout.overflow).toBeLessThanOrEqual(1);
        expect(layout.width).toBeGreaterThan(200);
        expect(layout.legendsNative).toBe(true);
        expect(layout.outside).toBe(false);
        timelineChecks.push({ scope, trial, time, expectedMarkers, ...actual, layout });
      }
      async function check(scope: 'scene' | 'fallback', inputs: GuideInputs, trial: 'reference' | 'current') {
        const frame = orbit(scope).locator('[data-orbit-frame]'), group = orbit(scope).locator('[data-orbit-cycle-controls="true"]');
        const time = await page.evaluate(() => (window as any).__bucket().seismicTime);
        await expect(frame).toHaveAttribute('data-orbit-frame', String(time));
        await expect(frame).toHaveAttribute('data-orbit-trial', trial);
        await expect(group).toHaveAttribute('role', 'group');
        await expect(group).toHaveAttribute('aria-label', 'Inspect free-vibration cycle');
        const actual = await group.locator('button').evaluateAll(nodes => nodes.map(node => {
          const button = node as HTMLButtonElement, descriptionId = button.getAttribute('aria-describedby');
          const description = descriptionId ? document.getElementById(descriptionId) : null;
          const box = button.getBoundingClientRect();
          return { step: button.getAttribute('data-orbit-step'), kind: button.getAttribute('data-orbit-kind'),
            previous: button.getAttribute('data-orbit-previous'), next: button.getAttribute('data-orbit-next'),
            raw: button.getAttribute('data-orbit-' + button.getAttribute('data-orbit-step') + '-time'),
            name: button.getAttribute('aria-label'), type: button.type, disabled: button.disabled,
            description: description?.textContent || '', descriptionId,
            uniqueDescription: descriptionId ? [...document.querySelectorAll('[id]')].filter(element => element.id === descriptionId).length : 0,
            visibleDescription: !!description && !!description.getClientRects().length && !description.closest('[aria-hidden="true"],svg'),
            box: { x: box.x, y: box.y, width: box.width, height: box.height }, overflow: button.scrollWidth - button.clientWidth };
        }));
        expect(actual).toHaveLength(4);
        const roots = cycleRoots(inputs);
        for (const [index, [step, kind]] of order.entries()) {
          const button = actual[index], times = roots[kind].filter(value => step === 'previous' ? value < time - 1e-7 : value > time + 1e-7);
          const expected = step === 'previous' ? times.at(-1) : times[0];
          expect(button.step).toBe(step); expect(button.kind).toBe(kind);
          expect(button[step]).toBe(kind);
          expect(button.name).toBe((step === 'previous' ? 'Previous ' : 'Next ') + (kind === 'turning' ? 'turning point' : 'center crossing'));
          expect(button.type).toBe('button'); expect(button.disabled).toBe(expected === undefined);
          expect(button.uniqueDescription).toBe(1); expect(button.visibleDescription).toBe(true);
          if (expected === undefined) {
            expect(button.raw).toBeNull();
            expect(button.description).toBe(step === 'previous' ? 'No earlier moment' : 'No later moment');
          } else {
            expect(button.raw).not.toBeNull();
            expect(Math.abs(Number(button.raw) - expected), 'target is an independent sampled zero').toBeLessThan(1e-9);
            expect(Math.abs(Number(button.raw) - time), 'a cycle control never targets the current moment').toBeGreaterThan(1e-7);
            expect(button.description).toBe(expected.toFixed(3) + ' s');
          }
          expect(button.box.height).toBeGreaterThanOrEqual(44);
          expect(button.overflow).toBeLessThanOrEqual(1);
        }
        expect(Math.abs(actual[0].box.y - actual[1].box.y)).toBeLessThan(1);
        expect(Math.abs(actual[2].box.y - actual[3].box.y)).toBeLessThan(1);
        expect(Math.abs(actual[0].box.x - actual[2].box.x)).toBeLessThan(1);
        expect(Math.abs(actual[1].box.x - actual[3].box.x)).toBeLessThan(1);
        expect(actual[1].box.x).toBeGreaterThan(actual[0].box.x + actual[0].box.width);
        expect(actual[2].box.y).toBeGreaterThanOrEqual(actual[0].box.y + actual[0].box.height);
        expect(await group.evaluate(node => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1);
        await checkTimeline(scope, inputs, trial, time);
        return actual;
      }
      async function jump(scope: 'scene' | 'fallback', inputs: GuideInputs, trial: 'reference' | 'current', step: CycleStep, kind: CycleKind, key: 'Enter' | 'Space') {
        const before = await page.evaluate(() => (window as any).__bucket());
        const expectedButtons = await check(scope, inputs, trial);
        const index = order.findIndex(pair => pair[0] === step && pair[1] === kind), selected = expectedButtons[index];
        expect(selected.disabled).toBe(false);
        const button = orbit(scope).locator('[data-orbit-' + step + '="' + kind + '"]');
        await button.focus(); await button.press(key);
        const after = await page.evaluate(() => (window as any).__bucket());
        expect(after, 'cycle stepping changes only exact time and animation pause flags').toEqual({ ...before,
          seismicTime: Number(selected.raw), seismicPlaying: false, autoDriving: false });
        await expect(orbit(scope).locator('[data-orbit-insight="' + kind + '"]')).toContainText('approximately zero');
        await expect(orbit(scope).locator('[data-orbit-cycle-precision="' + kind + '"]')).toHaveText('Small nonzero readings at a cycle moment can come from numerical precision in the estimated crossing.');
        await check(scope, inputs, trial);
        records.push({ scope, trial, step, kind, key, before, after, target: Number(selected.raw) });
        return after.seismicTime as number;
      }
      async function capture(scope: 'scene' | 'fallback', suffix: string) {
        const group = orbit(scope).locator('[data-orbit-cycle-controls="true"]');
        const map = orbit(scope).locator('[data-orbit-cycle-map]');
        await map.evaluate(node => node.scrollIntoView({ block: 'center', behavior: 'instant' }));
        await group.evaluate(node => {
          const map = node.parentElement!.querySelector('[data-orbit-cycle-map]')!;
          const first = map.getBoundingClientRect(), last = node.getBoundingClientRect();
          for (let parent = node.parentElement; parent; parent = parent.parentElement) {
            if (parent.scrollHeight <= parent.clientHeight || !/(auto|scroll)/.test(getComputedStyle(parent).overflowY)) continue;
            const box = parent.getBoundingClientRect(), header = parent.querySelector(':scope > summary')?.getBoundingClientRect();
            const top = Math.max(0, box.top, header?.bottom || 0), bottom = Math.min(innerHeight, box.bottom);
            parent.scrollTop += (first.top + last.bottom - top - bottom) / 2;
            break;
          }
        });
        const bounds = await group.evaluate(node => {
          const box = node.getBoundingClientRect(), map = node.parentElement!.querySelector('[data-orbit-cycle-map]')!.getBoundingClientRect();
          const drawer = node.closest('[data-bridge-scene-readout]'), sticky = drawer?.querySelector(':scope > summary')?.getBoundingClientRect();
          return { top: map.top, bottom: box.bottom, headerBottom: sticky?.bottom, drawerBottom: drawer?.getBoundingClientRect().bottom, height: innerHeight };
        });
        expect(bounds.top).toBeGreaterThanOrEqual(bounds.headerBottom ?? 0);
        expect(bounds.bottom).toBeLessThanOrEqual(Math.min(bounds.height, bounds.drawerBottom ?? bounds.height));
        if (scope === 'scene') await stage.screenshot({ path: join(report, 'orbit-cycle-map-' + width + '-' + suffix + '-scene.png') });
        else await page.screenshot({ path: join(report, 'orbit-cycle-map-' + width + '-' + suffix + '-page.png') });
        await map.screenshot({ path: join(report, 'orbit-cycle-map-' + width + '-' + suffix + '-map.png') });
        await group.screenshot({ path: join(report, 'orbit-cycle-map-' + width + '-' + suffix + '-controls.png') });
      }
      const atEnd = await check('scene', savedInputs, 'reference');
      expect(atEnd.map(button => button.disabled)).toEqual([false, true, false, true]);
      await capture('scene', 'end');
      const lastTurning = await jump('scene', savedInputs, 'reference', 'previous', 'turning', 'Enter');
      await capture('scene', 'turning');
      await jump('scene', savedInputs, 'reference', 'previous', 'turning', 'Space');
      expect(await jump('scene', savedInputs, 'reference', 'next', 'turning', 'Enter')).toBe(lastTurning);
      await page.evaluate(() => (window as any).__set({ seismicTime: 24 }));
      const lastCrossing = await jump('scene', savedInputs, 'reference', 'previous', 'crossing', 'Space');
      await capture('scene', 'crossing');
      await jump('scene', savedInputs, 'reference', 'previous', 'crossing', 'Enter');
      expect(await jump('scene', savedInputs, 'reference', 'next', 'crossing', 'Space')).toBe(lastCrossing);
      await page.getByRole('button', { name: 'B · current', exact: true }).click();
      await page.evaluate(() => (window as any).__set({ seismicTime: 24 }));
      const bEnd = await check('scene', currentInputs, 'current');
      expect(bEnd[0].raw).not.toBe(atEnd[0].raw);
      await jump('scene', currentInputs, 'current', 'previous', 'turning', 'Space');
      await jump('scene', currentInputs, 'current', 'previous', 'crossing', 'Enter');
      await page.evaluate(() => (window as any).__set({ seismicTime: 0 }));
      expect((await check('scene', currentInputs, 'current')).map(button => button.disabled)).toEqual([true, false, true, false]);
      if (width === 320) await capture('scene', 'before-free');
      await page.evaluate(() => (window as any).__set({ seismicTime: 3.125 }));
      await check('scene', currentInputs, 'current');
      await page.evaluate(() => (window as any).__set({ seismicTime: 16 }));
      await check('scene', currentInputs, 'current');
      if (width === 320) await capture('scene', 'free-start');
      await page.evaluate(() => (window as any).__set({ seismicTime: 0 }));
      await jump('scene', currentInputs, 'current', 'next', 'crossing', 'Space');
      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 0.000000001, seismicTime: 20.123 }));
      const tinyInputs = await flowCurrentInputs(page);
      expect((await check('scene', tinyInputs, 'current')).every(button => !button.disabled)).toBe(true);
      await jump('scene', tinyInputs, 'current', 'previous', 'turning', 'Enter');
      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 0, seismicTime: 20.123 }));
      const zeroInputs = await flowCurrentInputs(page);
      expect((await check('scene', zeroInputs, 'current')).every(button => button.disabled)).toBe(true);
      await expect(orbit('scene').locator('[data-orbit-frame]')).toHaveAttribute('data-orbit-active-scale', 'true');
      if (width === 320) await capture('scene', 'zero-paired');
      await page.getByRole('button', { name: 'Exit fullscreen 3D bridge (Escape)', exact: true }).click();
      await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.evaluate(() => (window as any).__set({ bridgeView: '2d', seismicIntensityG: 0.24, seismicTime: 24 }));
      await expect(orbit('fallback')).toBeVisible();
      await expect(orbit('scene')).toHaveCount(0);
      const fallbackTurning = await jump('fallback', currentInputs, 'current', 'previous', 'turning', 'Space');
      await jump('fallback', currentInputs, 'current', 'previous', 'turning', 'Enter');
      expect(await jump('fallback', currentInputs, 'current', 'next', 'turning', 'Space')).toBe(fallbackTurning);
      await capture('fallback', 'fallback');
      await checkWorkflowHealth(page);
      await writeFile(join(report, 'orbit-cycle-map-' + width + '-state.json'), JSON.stringify({ width,
        independentRoots: { reference: aRoots, current: bRoots }, atEnd, bEnd, records, timelineChecks }, null, 2));
    });
  }

  for (const width of [1000, 320]) {
    test('evidence navigation: exact frame, keyboard focus and fallback at ' + width + 'px', async ({ page }) => {
      test.setTimeout(480_000);
      const report = process.env.BRIDGE_CAPTURE_REPORT || ENHANCEMENT_REPORT;
      await mkdir(report, { recursive: true });
      await mountWorkflow(page, width, { bridgeView: 'immersive', bridgeObserver: 'bank', seismicEnabled: true,
        seismicIntensityG: 0.12, seismicDampingRatio: 0.05, seismicFrequencyHz: 1.1, seismicArchetype: 'balanced',
        seismicTime: 7.217, seismicEnergyOrbit: false, seismicMotionGuide: false,
        seismicPlaying: false, autoDriving: false, seismicReadoutCollapsed: false,
        crossSectionMm2: 30000, lateralBraceEvery: 1, seismicIntervalPinS: 3.14159,
        seismicSceneRecording: false, seismicTrialName: 'Navigation reference',
        seismicObservation: 'Keep my evidence and the selected frame.' });
      await page.getByRole('button', { name: 'Save earthquake trial', exact: true }).click();
      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 0.24, seismicSceneCompare: true,
        seismicSceneSource: 'saved', seismicReferenceIndex: 0, seismicSceneTrial: 'reference', seismicEnergyOrbit: true }));
      const stage = page.locator('[data-allo-fs-stage]');
      await stage.scrollIntoViewIfNeeded();
      await page.getByRole('button', { name: 'Focus scene', exact: true }).click();
      await page.getByRole('button', { name: 'View the 3D bridge fullscreen', exact: true }).click();
      await checkBridgeCanvasFillsStage(page);
      await page.locator('[data-bridge-scene-drawer]').locator('summary').first().press('Enter');
      const records: any[] = [];
      let revision = 0;
      async function jump(scope: 'scene' | 'fallback', destination: 'motion' | 'orbit', key: 'Enter' | 'Space', suffix?: string, running = false) {
        const target = page.locator(destination === 'motion' ? '[data-bridge-motion-guide="' + scope + '"]'
          : '[data-bridge-energy-orbit="' + scope + '"]');
        const origin = page.locator(destination === 'motion' ? '[data-bridge-energy-orbit="' + scope + '"]'
          : '[data-bridge-motion-guide="' + scope + '"]');
        const button = origin.getByRole('button', { name: destination === 'motion'
          ? 'View deck and ground positions' : 'View motion on the energy orbit', exact: true });
        const summary = target.locator(':scope > summary');
        await expect(button).toHaveAttribute('type', 'button');
        await expect(button).toHaveAttribute('data-bridge-evidence-jump', destination);
        const targetId = await target.getAttribute('id');
        expect(targetId, 'the destination has a native disclosure ID').toBeTruthy();
        await expect(button).toHaveAttribute('aria-controls', targetId!);
        expect(await page.evaluate(id => [...document.querySelectorAll('[id]')].filter(node => node.id === id).length, targetId)).toBe(1);
        // The capture listener runs before React's click handler, even while replay advances.
        await button.evaluate(node => node.addEventListener('click', () => {
          (window as any).__evidenceJumpBefore = JSON.parse(JSON.stringify((window as any).__bucket()));
        }, { capture: true, once: true }));
        await button.focus();
        await button.press(key);
        await expect(summary).toBeFocused();
        expect(await target.evaluate(node => (node as HTMLDetailsElement).open)).toBe(true);
        const before = await page.evaluate(() => (window as any).__evidenceJumpBefore);
        const after = await page.evaluate(() => (window as any).__bucket());
        if (running) expect(before.seismicPlaying, 'real replay was still running at native activation').toBe(true);
        expect(after, 'jump changes only the target disclosure and pauses both animations').toEqual({ ...before,
          [destination === 'motion' ? 'seismicMotionGuide' : 'seismicEnergyOrbit']: true,
          seismicPlaying: false, autoDriving: false });
        const frame = target.locator(destination === 'motion' ? '[data-motion-frame]' : '[data-orbit-frame]');
        await expect(frame).toHaveAttribute(destination === 'motion' ? 'data-motion-frame' : 'data-orbit-frame', String(before.seismicTime));
        await expect(frame).toHaveAttribute(destination === 'motion' ? 'data-motion-trial' : 'data-orbit-trial',
          scope === 'scene' ? before.seismicSceneTrial : 'current');
        const geometry = await summary.evaluate((node, destination) => {
          const box = node.getBoundingClientRect(), parent = node.closest('[data-bridge-scene-readout]');
          const sticky = parent?.querySelector(':scope > summary')?.getBoundingClientRect();
          const diagram = node.parentElement!.querySelector(destination === 'motion'
            ? '[data-motion-position-diagram]' : '[data-orbit-plot]')!.getBoundingClientRect();
          return { top: box.top, bottom: box.bottom, left: box.left, right: box.right,
            viewport: document.documentElement.clientWidth, height: window.innerHeight,
            stickyBottom: sticky?.bottom, drawerBottom: parent?.getBoundingClientRect().bottom,
            diagram: { top: diagram.top, bottom: diagram.bottom, height: diagram.height },
            overflow: node.scrollWidth - node.clientWidth };
        }, destination);
        expect(geometry.top, 'focused summary remains in view').toBeGreaterThanOrEqual(-1);
        expect(geometry.bottom).toBeLessThanOrEqual(geometry.height + 1);
        if (scope === 'scene') expect(geometry.top, 'drawer header does not hide focus').toBeGreaterThanOrEqual(geometry.stickyBottom! - 1);
        expect(geometry.left).toBeGreaterThanOrEqual(-1);
        expect(geometry.right).toBeLessThanOrEqual(geometry.viewport + 1);
        expect(geometry.overflow).toBeLessThanOrEqual(1);
        const visibleBottom = Math.min(geometry.height, geometry.drawerBottom ?? geometry.height);
        expect(geometry.diagram.top, 'the destination diagram starts below its heading').toBeGreaterThanOrEqual(geometry.bottom - 1);
        expect(geometry.diagram.top, 'the jump immediately reveals the destination diagram').toBeLessThan(visibleBottom - 40);
        expect(Math.min(geometry.diagram.bottom, visibleBottom) - geometry.diagram.top,
          'a useful portion of the diagram is visible before any capture scroll').toBeGreaterThanOrEqual(Math.min(100, geometry.diagram.height / 2));
        expect(await target.evaluate(node => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1);
        records.push({ scope, destination, key, before, after, geometry });
        if (suffix) {
          if (scope === 'scene') await stage.screenshot({ path: join(report, 'evidence-navigation-' + width + '-' + suffix + '-scene.png') });
          else await page.screenshot({ path: join(report, 'evidence-navigation-' + width + '-' + suffix + '-page.png') });
          await frame.locator(destination === 'motion' ? '[data-motion-position-diagram]' : '[data-orbit-plot]')
            .screenshot({ path: join(report, 'evidence-navigation-' + width + '-' + suffix + '-diagram.png') });
        }
        // Tab continues within the opened evidence; an ordinary render must not pull focus back.
        await summary.focus();
        await page.keyboard.press('Tab');
        expect(await target.evaluate(node => node.contains(document.activeElement) && document.activeElement !== node.querySelector('summary'))).toBe(true);
        await page.evaluate(note => {
          (window as any).__evidenceFocus = document.activeElement;
          (window as any).__set({ seismicObservation: note });
        }, 'Ordinary render keeps keyboard position ' + (++revision));
        await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
        expect(await page.evaluate(() => document.activeElement === (window as any).__evidenceFocus), 'a later render retains the new keyboard position').toBe(true);
        expect(await page.evaluate(() => (window as any).__bucket().seismicTime), 'the paused frame remains exact after later renders').toBe(before.seismicTime);
      }
      await jump('scene', 'motion', 'Enter', 'reference-motion');
      await page.locator('[data-bridge-energy-orbit="scene"] > summary').press('Enter');
      await jump('scene', 'orbit', 'Space', 'reference-orbit');
      await jump('scene', 'motion', 'Space');
      await jump('scene', 'orbit', 'Enter');
      await page.getByRole('button', { name: 'B · current', exact: true }).click();
      await page.evaluate(() => (window as any).__set({ seismicTime: 12.319, seismicSceneRecording: true }));
      await jump('scene', 'motion', 'Enter');
      await jump('scene', 'orbit', 'Space');
      // Capture an advancing replay at activation, rather than racing an earlier time read.
      await page.evaluate(() => (window as any).__set({ seismicSceneFocus: false, seismicReadoutCollapsed: false, seismicReplaySpeed: 0.25 }));
      await page.getByRole('button', { name: 'Replay scene', exact: true }).click();
      await jump('scene', 'motion', 'Enter', undefined, true);
      await page.getByRole('button', { name: 'Replay scene', exact: true }).click();
      await jump('scene', 'orbit', 'Space', undefined, true);
      await page.getByRole('button', { name: 'Exit fullscreen 3D bridge (Escape)', exact: true }).click();
      await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.evaluate(() => (window as any).__set({ bridgeView: '2d', seismicTime: 7.217,
        seismicMotionGuide: false, seismicEnergyOrbit: true, seismicPlaying: false, autoDriving: false }));
      await expect(page.locator('[data-bridge-energy-orbit="fallback"]')).toBeVisible();
      await expect(page.locator('[data-bridge-energy-orbit="scene"]')).toHaveCount(0);
      await jump('fallback', 'motion', 'Space', 'fallback-motion');
      await page.locator('[data-bridge-energy-orbit="fallback"] > summary').press('Enter');
      await jump('fallback', 'orbit', 'Enter', 'fallback-orbit');
      await jump('fallback', 'motion', 'Enter');
      await jump('fallback', 'orbit', 'Space');
      await checkWorkflowHealth(page);
      await writeFile(join(report, 'evidence-navigation-' + width + '-state.json'), JSON.stringify({ width, records }, null, 2));
    });
  }
  for (const width of [1000, 320]) {
    test('orbit components: precise tiny motion, shared scales and true zero at ' + width + 'px', async ({ page }) => {
      test.setTimeout(600_000);
      const oracle = await loadFrameEnergyOracle();
      const report = process.env.BRIDGE_CAPTURE_REPORT || ENHANCEMENT_REPORT;
      await mkdir(report, { recursive: true });
      await mountWorkflow(page, width, { bridgeView: 'immersive', bridgeObserver: 'bank', seismicEnabled: true,
        seismicIntensityG: 0.000001, seismicDampingRatio: 0.05, seismicFrequencyHz: 1.1, seismicArchetype: 'balanced',
        seismicTime: 7.217, seismicEnergyOrbit: false, seismicPlaying: false, autoDriving: false,
        seismicReadoutCollapsed: false, crossSectionMm2: 30000, lateralBraceEvery: 1,
        seismicTrialName: 'Tiny orbit reference', seismicObservation: 'Connect motion to the energy components.' });
      await page.getByRole('button', { name: 'Save earthquake trial', exact: true }).click();
      const saved = await page.evaluate(() => (window as any).__bucket().seismicTrials);
      const tinyInputs = saved[0].inputs;
      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 0.000002, seismicSceneCompare: true,
        seismicSceneSource: 'saved', seismicReferenceIndex: 0, seismicSceneTrial: 'current', seismicEnergyOrbit: true }));
      const doubleInputs = await flowCurrentInputs(page);
      const stage = page.locator('[data-allo-fs-stage]');
      await stage.scrollIntoViewIfNeeded();
      await page.getByRole('button', { name: 'Focus scene', exact: true }).click();
      await page.getByRole('button', { name: 'View the 3D bridge fullscreen', exact: true }).click();
      await checkBridgeCanvasFillsStage(page);
      await page.locator('[data-bridge-scene-drawer]').locator('summary').first().press('Enter');
      const orbit = page.locator('[data-bridge-energy-orbit="scene"]');
      const frame = orbit.locator('[data-orbit-frame]');
      const records = new Map<string, any>();
      const state: Record<string, any> = { width, inputs: { tiny: tinyInputs, double: doubleInputs } };
      function response(inputs: GuideInputs) {
        const key = JSON.stringify(Object.keys(inputs).sort().map(name => [name, inputs[name]]));
        if (!records.has(key)) records.set(key, oracle.bridgeSeismicResponse(inputs));
        return records.get(key);
      }
      function relative(actual: number, expected: number, label: string) {
        if (expected === 0) expect(actual, label + ' retains true zero').toBe(0);
        else expect(Math.abs(actual - expected), label).toBeLessThanOrEqual(Math.abs(expected) * 2e-9);
      }
      async function check(inputs: GuideInputs, trial: 'reference' | 'current', paired?: GuideInputs, time = 7.217) {
        const selected = response(inputs), other = paired ? response(paired) : null;
        const point = oracle.bridgeSeismicSample(selected, time);
        // Compute coordinates and energies independently of the orbit renderer.
        const elastic = 2 * Math.PI * selected.naturalFrequencyHz * point.relativeM;
        const kinetic = point.velocityMps;
        const maximum = Math.max(selected.peaks.storedJPerKg, other?.peaks.storedJPerKg || 0);
        const limit = maximum > 0 ? Math.sqrt(2 * maximum) * 1.04 : 1;
        const energies = { kinetic: kinetic * kinetic / 2, elastic: elastic * elastic / 2,
          stored: (kinetic * kinetic + elastic * elastic) / 2 };
        const coordinates = { elastic, kinetic };
        await expect(frame).toHaveAttribute('data-orbit-frame', String(time));
        await expect(frame).toHaveAttribute('data-orbit-trial', trial);
        await expect(frame).toHaveAttribute('data-orbit-active-scale', String(maximum > 0));
        if (maximum === 0) await expect(frame).toHaveAttribute('data-orbit-limit', '1');
        else await expect.poll(async () => Math.abs(Number(await frame.getAttribute('data-orbit-limit')) - limit) / limit)
          .toBeLessThanOrEqual(2e-9);
        const evidence = await frame.evaluate(node => {
          const readings = (selector: string, id: string) => Object.fromEntries(
            [...node.querySelectorAll<HTMLElement>(selector)].map(row => [row.getAttribute(id)!, {
              value: Number(row.getAttribute('data-orbit-value')), text: row.textContent || '',
              strong: row.querySelector('strong')?.textContent || '', native: !row.closest('svg,[aria-hidden="true"]'),
              overflow: row.scrollWidth - row.clientWidth, fontSize: parseFloat(getComputedStyle(row).fontSize),
              strongTop: row.querySelector('strong')?.getBoundingClientRect().top,
              whiteSpace: row.querySelector('strong') ? getComputedStyle(row.querySelector('strong')!).whiteSpace : null
            }]));
          const components = Object.fromEntries([...node.querySelectorAll<SVGPathElement>('[data-orbit-component]')].map(path => {
            const start = path.getPointAtLength(0), end = path.getPointAtLength(path.getTotalLength());
            return [path.getAttribute('data-orbit-component')!, { value: Number(path.getAttribute('data-orbit-coordinate')),
              stroke: path.getAttribute('stroke'), start: [start.x, start.y], end: [end.x, end.y] }];
          }));
          return { limit: Number(node.getAttribute('data-orbit-limit')), energies: readings('[data-orbit-energy]', 'data-orbit-energy'),
            coordinates: readings('[data-orbit-coordinate-reading]', 'data-orbit-coordinate-reading'), components,
            range: node.querySelector('[data-orbit-range]')?.textContent || '',
            rings: [...node.querySelectorAll('[data-orbit-reference-energy]')].map(ring => ({
              value: Number(ring.getAttribute('data-orbit-reference-energy')), text: ring.textContent || '' })),
            hint: node.querySelector('[data-orbit-component-hint]')?.textContent || '',
            displacement: { value: Number(node.querySelector('[data-orbit-displacement-m]')?.getAttribute('data-orbit-displacement-m')),
              text: node.querySelector('[data-orbit-displacement-m]')?.textContent || '' },
            motion: { direction: Number(node.querySelector('[data-orbit-motion-direction]')?.getAttribute('data-orbit-motion-direction')),
              directionText: node.querySelector('[data-orbit-motion-direction]')?.textContent || '',
              kind: node.querySelector('[data-orbit-motion-insight]')?.getAttribute('data-orbit-motion-insight'),
              text: node.querySelector('[data-orbit-motion-insight]')?.textContent || '' },
            scope: node.querySelector('[data-orbit-motion-scope]')?.textContent || '',
            helps: [...node.querySelectorAll('[data-orbit-scientific-help]')].map(help => help.textContent || ''),
            recent: [...node.querySelectorAll('[data-orbit-recent]')].map(path => path.getAttribute('points')),
            curves: [...node.querySelectorAll('[data-orbit-free]')].map(path => path.getAttribute('points')),
            overflow: node.scrollWidth - node.clientWidth };
        });
        relative(evidence.limit, limit, 'shared physical axis range');
        for (const id of ['kinetic', 'elastic', 'stored'] as const) {
          relative(evidence.energies[id].value, energies[id], id + ' energy');
          expect(evidence.energies[id].strong).toBe(frameEnergyNumber(energies[id]));
          expect(evidence.energies[id].native).toBe(true);
          expect(evidence.energies[id].overflow).toBeLessThanOrEqual(1);
        }
        for (const id of ['elastic', 'kinetic'] as const) {
          const reading = evidence.coordinates[id], component = evidence.components[id];
          relative(reading.value, coordinates[id], id + ' signed coordinate');
          relative(component.value, coordinates[id], id + ' projection coordinate');
          expect(reading.strong).toBe(frameEnergyNumber(coordinates[id]) + ' m/s');
          expect(reading.native).toBe(true);
          expect(reading.fontSize).toBeGreaterThanOrEqual(11);
          expect(reading.whiteSpace).toBe('nowrap');
          expect(reading.overflow).toBeLessThanOrEqual(1);
          expect(component.stroke).toBe(id === 'elastic' ? '#7dd3fc' : '#fbbf24');
          const x = 130 + 87 * elastic / limit, y = 112 - 87 * kinetic / limit;
          const start = id === 'elastic' ? [130, 112] : [x, 112];
          const end = id === 'elastic' ? [x, 112] : [x, y];
          for (const index of [0, 1]) {
            expect(Math.abs(component.start[index] - start[index]), id + ' starts at its physical projection').toBeLessThan(0.002);
            expect(Math.abs(component.end[index] - end[index]), id + ' ends at its physical projection').toBeLessThan(0.002);
          }
        }
        relative(evidence.displacement.value, point.relativeM, 'raw signed deck offset');
        expect(evidence.displacement.text).toBe((point.relativeM > 0 ? '+' : '') + frameEnergyNumber(point.relativeM * 100) + ' cm');
        expect(evidence.coordinates.elastic.text).toContain('Deck offset u');
        expect(evidence.coordinates.kinetic.text).toContain('Motion direction');
        // Read physical state from independent sampled displacement and velocity.
        // Ratios make approximate zero independent of excitation size or A/B scale.
        const magnitude = Math.max(Math.abs(elastic), Math.abs(kinetic));
        const nearU = magnitude === 0 || Math.abs(elastic) / magnitude <= 1e-12;
        const nearV = magnitude === 0 || Math.abs(kinetic) / magnitude <= 1e-12;
        const kind = magnitude === 0 ? 'rest' : nearV ? 'stationary' : nearU ? 'centered'
          : point.relativeM * kinetic > 0 ? 'away' : 'toward';
        const direction = nearV ? 0 : Math.sign(kinetic);
        const directionText = direction > 0 ? 'Positive (+)' : direction < 0 ? 'Negative (−)'
          : kind === 'rest' ? 'At rest' : 'Nearly stopped';
        const descriptions = {
          away: 'The deck moves farther from zero relative displacement. The spring stores energy.',
          toward: 'The deck moves toward zero relative displacement. The spring releases energy.',
          stationary: 'The deck is nearly stopped relative to the ground. A displaced spring can still push it back.',
          centered: 'The deck is near zero relative displacement and still moving relative to the ground.',
          rest: 'The deck is at rest relative to the ground.'
        };
        expect(evidence.motion).toEqual({ direction, directionText, kind, text: descriptions[kind] });
        expect(evidence.scope).toBe('Both axes describe sideways motion relative to the ground. The vertical axis shows velocity.');
        expect(Math.abs(evidence.coordinates.elastic.strongTop! - evidence.coordinates.kinetic.strongTop!), 'coordinate values share a native baseline').toBeLessThanOrEqual(1);
        expect(evidence.coordinates.elastic.text).toContain('Scaled displacement ωu');
        expect(evidence.coordinates.kinetic.text).toContain('Relative velocity v');
        expect(evidence.hint).toBe('Blue: elastic = (ωu)²/2. Gold: kinetic = v²/2. Stored = elastic + kinetic.');
        expect(evidence.range).toBe(maximum > 0 ? 'Axis range: ±' + frameEnergyNumber(limit) + ' m/s'
          : 'No motion recorded; point stays at the center.');
        expect(evidence.rings).toHaveLength(maximum > 0 ? 2 : 0);
        for (const [index, ring] of evidence.rings.entries()) {
          const radius = index === 0 ? 0.5 : 1;
          const energy = limit * limit * radius * radius / 2;
          relative(ring.value, energy, 'reference ring energy');
          expect(ring.text).toBe(frameEnergyNumber(energy) + ' J/kg');
        }
        const scientific = maximum > 0 && [point.relativeM * 100, limit, ...Object.values(coordinates), ...Object.values(energies),
          limit * limit / 8, limit * limit / 2].some(value => value !== 0 && Math.abs(value) < 0.001);
        expect(evidence.helps).toHaveLength(scientific ? 1 : 0);
        if (scientific) expect(evidence.helps[0]).toContain('2.5e-6 means 0.0000025');
        expect(evidence.overflow).toBeLessThanOrEqual(1);
        expect(evidence.curves.join(' ')).not.toMatch(/NaN|Infinity/);
        return evidence;
      }
      async function capture(suffix: string, complete = false) {
        await orbit.locator('[data-orbit-plot]').evaluate(node => node.scrollIntoView({ block: 'start', behavior: 'instant' }));
        await stage.screenshot({ path: join(report, 'orbit-components-' + width + '-' + suffix + '-scene.png') });
        await orbit.locator('[data-orbit-plot]').screenshot({ path: join(report, 'orbit-components-' + width + '-' + suffix + '-plot.png') });
        if (!complete) return;
        // Retain native width and font sizes, with enough fullscreen height to
        // show the complete evidence. Normal-height scroll is checked separately.
        const viewport = page.viewportSize()!;
        const before = await frame.getAttribute('data-orbit-frame');
        await page.getByRole('button', { name: 'Exit fullscreen 3D bridge (Escape)', exact: true }).click();
        await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true);
        const height = await frame.evaluate(node => node.getBoundingClientRect().height);
        await page.setViewportSize({ width, height: Math.max(viewport.height, 1400, Math.ceil(height) + 450) });
        await page.getByRole('button', { name: 'View the 3D bridge fullscreen', exact: true }).click();
        await frame.evaluate(node => node.scrollIntoView({ block: 'center', behavior: 'instant' }));
        const bounds = await frame.evaluate(node => {
          const box = node.getBoundingClientRect(), panel = node.closest('[data-bridge-scene-readout]')!.getBoundingClientRect();
          return { top: box.top, bottom: box.bottom, panelTop: panel.top, panelBottom: panel.bottom };
        });
        expect(bounds.top).toBeGreaterThanOrEqual(bounds.panelTop + 2);
        expect(bounds.bottom).toBeLessThanOrEqual(bounds.panelBottom - 2);
        await frame.screenshot({ path: join(report, 'orbit-components-' + width + '-' + suffix + '-evidence.png') });
        await page.getByRole('button', { name: 'Exit fullscreen 3D bridge (Escape)', exact: true }).click();
        await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true);
        await page.setViewportSize(viewport);
        await page.getByRole('button', { name: 'View the 3D bridge fullscreen', exact: true }).click();
        await expect(frame).toHaveAttribute('data-orbit-frame', before!);
      }
      state.doubleB = await check(doubleInputs, 'current', tinyInputs);
      expect(state.doubleB.limit).toBeGreaterThan(0);
      expect(state.doubleB.limit).toBeLessThan(0.01);
      expect(state.doubleB.recent).toHaveLength(4);
      expect(state.doubleB.energies.stored.strong).toMatch(/e-\d+/);
      const marker = orbit.locator('[data-orbit-marker="current"] circle');
      expect(await marker.evaluate(node => Math.hypot(Number(node.getAttribute('cx')) - 130,
        Number(node.getAttribute('cy')) - 112)), 'tiny motion has a visible physical orbit').toBeGreaterThan(8);
      await inspectWholeOrbit(page);
      await capture('tiny', true);
      // Exercise all four signs without coupling this assertion to the renderer's classifier.
      state.quadrants = {};
      for (const displacementSign of [-1, 1]) for (const velocitySign of [-1, 1]) {
        const selected = response(doubleInputs);
        const sample = selected.samples.find((entry: any) => entry.timeS > 0.1 &&
          Math.sign(entry.relativeM) === displacementSign && Math.sign(entry.velocityMps) === velocitySign &&
          Math.min(Math.abs(2 * Math.PI * selected.naturalFrequencyHz * entry.relativeM), Math.abs(entry.velocityMps)) >
          Math.max(Math.abs(2 * Math.PI * selected.naturalFrequencyHz * entry.relativeM), Math.abs(entry.velocityMps)) * 0.01);
        expect(sample, 'recorded response includes this motion quadrant').toBeTruthy();
        await page.evaluate(time => (window as any).__set({ seismicTime: time }), sample.timeS);
        state.quadrants[displacementSign + ',' + velocitySign] = await check(doubleInputs, 'current', tinyInputs, sample.timeS);
      }
      await page.evaluate(() => (window as any).__set({ seismicTime: 7.217 }));
      // Estimated cycle moments keep raw remainders and explain their precision.
      await orbit.getByRole('button', { name: 'Next turning point', exact: true }).click();
      await expect(orbit.locator('[data-orbit-insight="turning"]')).toContainText('approximately zero');
      await expect(orbit.locator('[data-orbit-cycle-precision="turning"]')).toHaveText('Small nonzero readings at a cycle moment can come from numerical precision in the estimated crossing.');
      await expect(orbit.locator('[data-orbit-motion-insight="stationary"]')).toHaveText('The deck is nearly stopped relative to the ground. A displaced spring can still push it back.');
      await expect(orbit.locator('[data-orbit-motion-direction="0"]')).toHaveText('Nearly stopped');
      if (width === 320) await capture('cycle', true);
      await orbit.getByRole('button', { name: 'Next center crossing', exact: true }).click();
      await expect(orbit.locator('[data-orbit-insight="crossing"]')).toContainText('approximately zero');
      await expect(orbit.locator('[data-orbit-cycle-precision="crossing"]')).toHaveText('Small nonzero readings at a cycle moment can come from numerical precision in the estimated crossing.');
      await expect(orbit.locator('[data-orbit-motion-insight="centered"]')).toHaveText('The deck is near zero relative displacement and still moving relative to the ground.');
      expect(Number(await orbit.locator('[data-orbit-motion-direction]').getAttribute('data-orbit-motion-direction'))).not.toBe(0);
      await page.evaluate(() => (window as any).__set({ seismicTime: 7.217 }));
      await expect(frame).toHaveAttribute('data-orbit-frame', '7.217');
      await page.getByRole('button', { name: 'A · reference', exact: true }).click();
      state.tinyA = await check(tinyInputs, 'reference', doubleInputs);
      expect(state.tinyA.limit).toBe(state.doubleB.limit);
      expect(state.tinyA.curves).toEqual(state.doubleB.curves);
      relative(state.doubleB.energies.stored.value, state.tinyA.energies.stored.value * 4, 'double excitation gives four times stored energy');
      await page.getByRole('button', { name: 'B · current', exact: true }).click();
      await page.evaluate(() => (window as any).__set({ seismicTime: 12.319 }));
      state.laterB = await check(doubleInputs, 'current', tinyInputs, 12.319);
      expect(state.laterB.limit).toBe(state.doubleB.limit);
      expect(state.laterB.curves).toEqual(state.doubleB.curves);
      await page.evaluate(() => (window as any).__set({ seismicTime: 7.217, seismicReadoutCollapsed: true }));
      await expect(page.locator('[data-bridge-compact-orbit]')).toContainText(frameEnergyNumber(state.doubleB.energies.stored.value) + ' J/kg');
      await page.evaluate(() => (window as any).__set({ seismicReadoutCollapsed: false }));
      if (width === 1000) {
        await page.locator('[data-bridge-scene-recorder] > summary').press('Enter');
        await page.getByRole('textbox', { name: 'Scene observation note', exact: true }).fill('Tiny motion keeps its signed velocity and scaled displacement.');
        await page.getByRole('button', { name: 'Save scene observation', exact: true }).click();
        const observation = await page.evaluate(() => (window as any).__bucket().seismicTrials[1]);
        expect(observation.scene.display.energyOrbit).toBe(true);
        expect(observation.timeS).toBe(7.217);
      }
      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 0, seismicSceneTrial: 'current' }));
      const zeroInputs = await flowCurrentInputs(page);
      state.zeroPaired = await check(zeroInputs, 'current', tinyInputs);
      expect(Object.values(state.zeroPaired.coordinates).every((reading: any) => reading.value === 0)).toBe(true);
      expect(Object.values(state.zeroPaired.energies).every((reading: any) => reading.value === 0)).toBe(true);
      await page.evaluate(() => (window as any).__set({ seismicSceneCompare: false }));
      state.zero = await check(zeroInputs, 'current');
      expect(state.zero.limit).toBe(1);
      await expect(orbit.getByRole('button', { name: 'Next turning point', exact: true })).toBeDisabled();
      await expect(orbit.getByRole('button', { name: 'Next center crossing', exact: true })).toBeDisabled();
      if (width === 320) await capture('zero', true);
      if (width === 1000) {
        await page.getByRole('button', { name: 'Exit fullscreen 3D bridge (Escape)', exact: true }).click();
        const evidence = page.locator('[data-seismic-scene-orbit]').last();
        for (const id of ['kinetic', 'elastic', 'stored'])
          await expect(evidence).toContainText(frameEnergyNumber(state.doubleB.energies[id].value));
        state.savedEvidence = await evidence.textContent();
        await page.getByRole('button', { name: 'Open earthquake evidence report', exact: true }).click();
        await expect(page.locator('[data-bridge-print-seismic] [data-seismic-scene-orbit]')).toHaveText(state.savedEvidence);
        await expect(page.locator('[data-bridge-print-seismic]').locator('button,input,select,textarea')).toHaveCount(0);
      }
      state.inputs.zero = zeroInputs;
      expect(await page.evaluate(() => (window as any).__bucket())).toMatchObject({ seismicPlaying: false, autoDriving: false,
        bridgeObserver: 'bank', seismicObservation: 'Connect motion to the energy components.' });
      await writeFile(join(report, 'orbit-components-' + width + '-state.json'), JSON.stringify(state, null, 2));
      await checkWorkflowHealth(page);
    });
  }
  for (const size of [{width:1000,height:800},{width:320,height:568}]) {
    test('orbit replay: recent motion, time direction and energy split at '+size.width+'px', async ({page}) => {
      await mountWorkflow(page,size.width,{bridgeView:'immersive',bridgeObserver:size.width===320?'deck':'bank',
        seismicEnabled:true,seismicEnergyOrbit:true,seismicForceLens:true,seismicGuideOpen:true,crossSectionMm2:30000,lateralBraceEvery:1});
      await page.setViewportSize(size);
      await page.getByRole('button',{name:'Prepare 5% / 20% comparison',exact:true}).click();
      await page.evaluate(()=>(window as any).__set({seismicTime:7.217}));
      const stage=page.locator('[data-allo-fs-stage]');await stage.scrollIntoViewIfNeeded();
      await page.getByRole('button',{name:'Focus scene',exact:true}).click();
      await page.getByRole('button',{name:'View the 3D bridge fullscreen',exact:true}).click();
      await checkBridgeCanvasFillsStage(page);
      const drawer=page.locator('[data-bridge-scene-drawer]');await drawer.locator('summary').first().press('Enter');
      const orbit=page.locator('[data-bridge-energy-orbit="scene"]');
      const histories=await orbit.locator('[data-orbit-free]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('points')));
      const limit=await orbit.locator('[data-orbit-frame]').getAttribute('data-orbit-limit');
      const paths=await orbit.locator('[data-orbit-recent]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('points')));
      await expect(orbit.locator('[data-orbit-recent]')).toHaveCount(4);
      await expect(orbit.locator('[data-orbit-direction]')).toHaveAttribute('data-orbit-direction','current');
      await expect(orbit.locator('[data-orbit-split] [role="img"]')).toHaveAccessibleName(/Kinetic .*%, Elastic .*%/);
      const before=await page.evaluate(()=>(window as any).__gl());
      await page.getByRole('button',{name:'Replay scene',exact:true}).click();
      await expect.poll(()=>page.evaluate(()=>(window as any).__bucket().seismicTime)).toBeGreaterThan(7.217);
      await page.getByRole('button',{name:'Pause scene replay',exact:true}).click();
      const paused=await page.evaluate(()=>(window as any).__bucket().seismicTime);
      expect(Number(await orbit.locator('[data-orbit-recent]').first().getAttribute('data-orbit-recent-end'))).toBeCloseTo(paused,10);
      expect(await orbit.locator('[data-orbit-recent]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('points')))).not.toEqual(paths);
      expect(await orbit.locator('[data-orbit-free]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('points')))).toEqual(histories);
      await page.getByRole('button',{name:'A · reference',exact:true}).click();
      expect(await page.evaluate(()=>(window as any).__bucket().seismicTime)).toBe(paused);
      await expect(orbit.locator('[data-orbit-recent]').first()).toHaveAttribute('data-orbit-recent','reference');
      await expect(orbit.locator('[data-orbit-split]')).toHaveAttribute('data-orbit-split','reference');
      await expect(orbit.locator('[data-orbit-frame]')).toHaveAttribute('data-orbit-limit',limit!);
      await inspectWholeOrbit(page);
      await stage.screenshot({path:join(ENHANCEMENT_REPORT,'bridge-'+size.width+'-recent-orbit.png')});
      await page.getByRole('button',{name:'Next turning point',exact:true}).click();
      expect(Number(await orbit.locator('[data-orbit-part="kinetic"]').getAttribute('data-orbit-fraction'))).toBeCloseTo(0,10);
      expect(Number(await orbit.locator('[data-orbit-part="elastic"]').getAttribute('data-orbit-fraction'))).toBeCloseTo(1,10);
      await page.getByRole('button',{name:'Next center crossing',exact:true}).click();
      expect(Number(await orbit.locator('[data-orbit-part="kinetic"]').getAttribute('data-orbit-fraction'))).toBeCloseTo(1,10);
      expect(Number(await orbit.locator('[data-orbit-part="elastic"]').getAttribute('data-orbit-fraction'))).toBeCloseTo(0,10);
      expect((await page.evaluate(()=>(window as any).__gl())).sceneBuilds).toBe(before.sceneBuilds);
      expect(await drawer.evaluate(node=>node.scrollWidth-node.clientWidth)).toBeLessThanOrEqual(1);
      await checkWorkflowHealth(page);
    });
  }

  for(const size of [{width:1000,height:800},{width:320,height:568}]){
    test('energy orbit: paired cycles, fixed curves, saved evidence and fullscreen at '+size.width+'px',async ({page})=>{
      await mountWorkflow(page,size.width,{bridgeView:'immersive',bridgeObserver:'bank',seismicEnabled:true,seismicGuideOpen:true,seismicEnergyOrbit:true,crossSectionMm2:30000,lateralBraceEvery:1});
      await page.setViewportSize(size);await page.getByRole('button',{name:'Prepare 5% / 20% comparison',exact:true}).click();
      await page.evaluate(()=>(window as any).__set({seismicTime:7.217}));
      const stage=page.locator('[data-allo-fs-stage]');await stage.scrollIntoViewIfNeeded();
      const before=await page.evaluate(()=>(window as any).__gl());
      await page.getByRole('button',{name:'Focus scene',exact:true}).click();await page.getByRole('button',{name:'View the 3D bridge fullscreen',exact:true}).click();await checkBridgeCanvasFillsStage(page);
      const drawer=page.locator('[data-bridge-scene-drawer]'),summary=drawer.locator('summary').first();await summary.press('Enter');
      const orbit=page.locator('[data-bridge-energy-orbit="scene"]'),plot=orbit.locator('[data-orbit-plot]');
      await plot.scrollIntoViewIfNeeded();await expect(plot).toBeVisible();await expect(orbit.locator('[data-orbit-marker]')).toHaveCount(2);
      const range=await orbit.locator('[data-orbit-frame]').getAttribute('data-orbit-limit');
      const curves=await orbit.locator('[data-orbit-free]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('points')));
      expect(curves[0]).not.toBe(curves[1]);expect(curves.join(' ')).not.toMatch(/NaN|Infinity/);
      const next=page.getByRole('button',{name:'Next turning point',exact:true}),turn=Number(await next.getAttribute('data-orbit-next-time'));await next.click();
      expect(await page.evaluate(()=>(window as any).__bucket().seismicTime)).toBe(turn);
      await expect(orbit.locator('[data-orbit-insight]')).toHaveAttribute('data-orbit-insight','turning');
      expect(Number(await orbit.locator('[data-orbit-energy="kinetic"]').getAttribute('data-orbit-value'))).toBeLessThan(1e-20);
      await page.getByRole('button',{name:'Next center crossing',exact:true}).click();
      await expect(orbit.locator('[data-orbit-insight]')).toHaveAttribute('data-orbit-insight','crossing');
      expect(Number(await orbit.locator('[data-orbit-energy="elastic"]').getAttribute('data-orbit-value'))).toBeLessThan(1e-20);
      await page.getByRole('button',{name:'A · reference',exact:true}).click();
      await expect(orbit.locator('[data-orbit-frame]')).toHaveAttribute('data-orbit-trial','reference');await expect(orbit.locator('[data-orbit-frame]')).toHaveAttribute('data-orbit-limit',range!);
      await page.getByRole('button',{name:'Next turning point',exact:true}).click();
      const time=await page.evaluate(()=>(window as any).__bucket().seismicTime);
      expect(await orbit.locator('[data-orbit-free]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('points')))).toEqual(curves);
      await inspectWholeOrbit(page);await stage.screenshot({path:join(ENHANCEMENT_REPORT,'bridge-'+size.width+'-energy-orbit.png')});
      expect(await drawer.evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(1);
      await next.focus();await next.press('Escape');await expect(drawer).not.toHaveAttribute('open');await expect(summary).toBeFocused();
      await expect(page.locator('[data-bridge-compact-orbit]')).toContainText('J/kg');
      await stage.screenshot({path:join(ENHANCEMENT_REPORT,'bridge-'+size.width+'-orbit-scene.png')});
      await summary.press('Enter');await page.locator('[data-bridge-scene-recorder] > summary').press('Enter');
      await page.getByRole('textbox',{name:'Scene observation note',exact:true}).fill('At a turning point the deck has no relative velocity.');await page.getByRole('button',{name:'Save scene observation',exact:true}).click();
      const saved=await page.evaluate(()=>(window as any).__bucket().seismicTrials[0]);expect(saved.scene.display.energyOrbit).toBe(true);expect(saved.timeS).toBe(time);
      await page.getByRole('button',{name:'Exit fullscreen 3D bridge (Escape)',exact:true}).click();
      await page.evaluate(()=>(window as any).__set({seismicEnergyOrbit:false,seismicTime:0,bridgeView:'2d',seismicDampingRatio:0.3}));
      await page.getByRole('button',{name:'Revisit scene observation 1: Scene observation 1',exact:true}).click();
      expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({seismicEnergyOrbit:true,seismicTime:time,seismicPlaying:false,seismicSceneTrial:'reference'});
      const evidence=await page.locator('[data-seismic-scene-orbit]').textContent();
      await page.getByRole('button',{name:'Open earthquake evidence report',exact:true}).click();
      await expect(page.locator('[data-bridge-print-seismic] [data-seismic-scene-orbit]')).toHaveText(evidence!);
      await expect(page.locator('[data-bridge-print-seismic]').locator('button,input,select,textarea')).toHaveCount(0);await checkWorkflowHealth(page);
    });
  }
  test('energy orbit: reduced-motion zero shaking, landscape tools and deliberate graphics recovery',async ({page})=>{
    await page.emulateMedia({reducedMotion:'reduce'});
    await mountWorkflow(page,844,{bridgeView:'immersive',bridgeObserver:'bank',seismicEnabled:true,seismicTime:16,seismicIntensityG:0,seismicEnergyOrbit:true,seismicSceneFocus:true,seismicReadoutCollapsed:true,crossSectionMm2:30000,lateralBraceEvery:1});
    await page.setViewportSize({width:844,height:390});const stage=page.locator('[data-allo-fs-stage]');await stage.scrollIntoViewIfNeeded();
    await page.getByRole('button',{name:'View the 3D bridge fullscreen',exact:true}).click();await checkBridgeCanvasFillsStage(page);
    const drawer=page.locator('[data-bridge-scene-drawer]');await drawer.locator('summary').first().press('Enter');
    const orbit=page.locator('[data-bridge-energy-orbit="scene"]');await inspectWholeOrbit(page);
    await expect(page.getByRole('button',{name:'Next turning point',exact:true})).toBeDisabled();await expect(page.getByRole('button',{name:'Next center crossing',exact:true})).toBeDisabled();
    await expect(orbit.locator('[data-orbit-insight]')).toContainText('No shaking');
    expect(await orbit.locator('[data-orbit-energy]').evaluateAll(rows=>rows.every(row=>Number(row.getAttribute('data-orbit-value'))===0))).toBe(true);
    await stage.screenshot({path:join(ENHANCEMENT_REPORT,'bridge-844-orbit-zero.png')});
    await page.getByRole('button',{name:'Next turning point',exact:true}).focus();
    await page.evaluate(()=>{const canvas=document.querySelector('canvas[data-bridge-gl]') as HTMLCanvasElement;const context=canvas.getContext('webgl2')||canvas.getContext('webgl'),extension=context?.getExtension('WEBGL_lose_context');if(!extension)throw new Error('No context loss extension');(window as any).__orbitLoss=extension;extension.loseContext();});
    await expect(page.locator('[data-bridge-elevation]')).toBeFocused();
    const fallback=page.locator('[data-bridge-energy-orbit="fallback"]');await expect(fallback).toHaveAttribute('open','');await expect(fallback.locator('[data-orbit-frame]')).toHaveAttribute('data-orbit-trial','current');
    await page.evaluate(()=>(window as any).__orbitLoss.restoreContext());await expect.poll(()=>page.evaluate(()=>(window as any).__gl().state)).toBe('ready');
    expect(await page.evaluate(()=>(window as any).__bucket().bridgeView)).toBe('2d');await page.getByRole('button',{name:'From the riverbank',exact:true}).click();
    expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({seismicEnergyOrbit:true,seismicPlaying:false,seismicTime:16});await checkWorkflowHealth(page);
  });
  test('energy orbit: undamped free-vibration inspection in the labelled 2D view',async ({page})=>{
    await page.emulateMedia({reducedMotion:'reduce'});await mountWorkflow(page,1000,{bridgeView:'3d',seismicEnabled:true,seismicTime:16,seismicDampingRatio:0,seismicEnergyOrbit:true});
    await page.getByRole('button',{name:'Labelled 2D view',exact:true}).click();
    const orbit=page.locator('[data-bridge-energy-orbit="fallback"]');await expect(orbit.locator('[data-orbit-insight]')).toContainText('undamped');
    const before=Number(await orbit.locator('[data-orbit-energy="stored"]').getAttribute('data-orbit-value'));
    await page.getByRole('button',{name:'Next turning point',exact:true}).click();await expect(orbit.locator('[data-orbit-insight]')).toHaveAttribute('data-orbit-insight','turning');
    await page.getByRole('button',{name:'Next center crossing',exact:true}).click();const after=Number(await orbit.locator('[data-orbit-energy="stored"]').getAttribute('data-orbit-value'));
    await expect(orbit.locator('[data-orbit-insight]')).toContainText('If damping is present');
    expect(Math.abs(after-before)/before).toBeLessThan(0.01);expect(await page.evaluate(()=>(window as any).__bucket().seismicPlaying)).toBe(false);
    await captureImmersiveRegion(page,orbit,'bridge-1000-orbit-2d.png',ENHANCEMENT_REPORT);await checkWorkflowHealth(page);
  });

  test('force lens: selected A/B vectors, fixed scale and stable resources in the riverbank scene',async ({page})=>{
    await mountWorkflow(page,1000,{bridgeView:'immersive',bridgeObserver:'bank',seismicEnabled:true,seismicGuideOpen:true,crossSectionMm2:30000,lateralBraceEvery:1});
    await page.setViewportSize({width:1000,height:800});
    await page.getByRole('button',{name:'Prepare 5% / 20% comparison',exact:true}).click();
    await page.evaluate(()=>(window as any).__set({seismicTime:7.217}));
    const stage=page.locator('[data-allo-fs-stage]');await stage.scrollIntoViewIfNeeded();
    const lens=page.locator('[data-bridge-force-lens="scene"]');
    await lens.locator(':scope > summary').press('Enter');
    await expect(lens).toHaveAttribute('open','');
    await stage.scrollIntoViewIfNeeded();
    await expect.poll(()=>page.evaluate(()=>(window as any).__gl().forceLensVisible)).toBe(true);
    const before=await page.evaluate(()=>(window as any).__gl());
    expect(before.forceTrial).toBe('current');expect(before.forceVectors).toHaveLength(3);
    const values=await lens.locator('[data-force-reading]').evaluateAll(rows=>rows.map(row=>Number(row.getAttribute('data-force-value'))));
    expect(values).toEqual(before.forceVectors.map((v:any)=>v.valueNPerKg));expect(values[0]+values[1]).toBeCloseTo(values[2],10);
    await page.getByRole('button',{name:'A · reference',exact:true}).click();await stage.scrollIntoViewIfNeeded();
    await expect.poll(()=>page.evaluate(()=>(window as any).__gl().forceTrial)).toBe('reference');
    const a=await page.evaluate(()=>(window as any).__gl());expect(a.forceLimitNPerKg).toBe(before.forceLimitNPerKg);
    expect(a.forceVectors.map((v:any)=>v.valueNPerKg)).not.toEqual(values);
    await expect(page.locator('[data-force-frame]')).toHaveAttribute('data-force-trial','reference');
    await page.getByRole('button',{name:'Focus scene',exact:true}).click();
    await expect(page.locator('[data-bridge-compact-forces]')).toContainText('N/kg');
    await page.getByRole('button',{name:'View the 3D bridge fullscreen',exact:true}).click();await checkBridgeCanvasFillsStage(page);
    await page.getByRole('button',{name:'Step scene backward 0.5 s',exact:true}).click();await page.getByRole('button',{name:'Step scene forward 0.5 s',exact:true}).click();
    await expect.poll(()=>page.evaluate(()=>(window as any).__gl().forceVectors[0].valueNPerKg)).toBeCloseTo(a.forceVectors[0].valueNPerKg,10);
    const warm=await page.evaluate(()=>(window as any).__gl());
    for(let cycle=0;cycle<3;cycle++){await page.getByRole('button',{name:'Step scene backward 0.5 s',exact:true}).click();await page.getByRole('button',{name:'Step scene forward 0.5 s',exact:true}).click();}
    expect(await page.evaluate(()=>(window as any).__gl().sceneBuilds)).toBe(before.sceneBuilds);expect(await page.evaluate(()=>(window as any).__gl().resources)).toEqual(warm.resources);
    await stage.screenshot({path:join(ENHANCEMENT_REPORT,'bridge-1000-force-bank.png')});
    await page.locator('[data-bridge-scene-drawer] > summary').press('Enter');await lens.locator('[data-force-reading="spring"]').scrollIntoViewIfNeeded();
    await stage.screenshot({path:join(ENHANCEMENT_REPORT,'bridge-1000-force-tools.png')});
    expect(await page.evaluate(()=>(window as any).__bucket().seismicTime)).toBe(7.217);expect(await page.evaluate(()=>(window as any).__bucket().seismicPlaying)).toBe(false);
    await checkWorkflowHealth(page);
  });

  test('force lens: phone walking, camera turns, keyboard tools and saved observation restoration',async ({page})=>{
    await page.emulateMedia({reducedMotion:'reduce'});
    await mountWorkflow(page,320,{bridgeView:'immersive',bridgeObserver:'deck',bridgeWalkPos:0.45,seismicEnabled:true,seismicTime:7.217,seismicForceLens:true,crossSectionMm2:30000,lateralBraceEvery:1});
    await page.setViewportSize({width:320,height:568});
    const stage=page.locator('[data-allo-fs-stage]');await stage.scrollIntoViewIfNeeded();
    await page.getByRole('button',{name:'Focus scene',exact:true}).click();await page.getByRole('button',{name:'View the 3D bridge fullscreen',exact:true}).click();await checkBridgeCanvasFillsStage(page);
    await expect.poll(()=>page.evaluate(()=>(window as any).__gl().forceLensVisible)).toBe(true);
    const before=await page.evaluate(()=>(window as any).__gl());
    await page.getByRole('button',{name:'Walk toward far end',exact:true}).click();
    await expect.poll(()=>page.evaluate(()=>(window as any).__gl().forceVectors[0].origin[0])).toBeCloseTo(before.forceVectors[0].origin[0]+1.5,8);
    const viewer=page.locator('[aria-describedby="bridge-gl-description"]');await viewer.focus();await viewer.press('ArrowRight');
    await expect.poll(()=>page.evaluate(()=>(window as any).__gl().forceVectors[0].origin[2])).not.toBe(before.forceVectors[0].origin[2]);
    expect(await page.evaluate(()=>(window as any).__gl().forceVectors.map((v:any)=>v.valueNPerKg))).toEqual(before.forceVectors.map((v:any)=>v.valueNPerKg));
    await stage.screenshot({path:join(ENHANCEMENT_REPORT,'bridge-320-force-walkway.png')});
    const drawer=page.locator('[data-bridge-scene-drawer]'),summary=drawer.locator('summary').first();await summary.press('Enter');
    const lens=page.locator('[data-bridge-force-lens="scene"]');await lens.locator(':scope > summary').scrollIntoViewIfNeeded();
    const causality=lens.locator('[data-force-motion="scene"]'),velocity=causality.locator('[data-force-relative-speed]');await velocity.scrollIntoViewIfNeeded();
    expect(await causality.locator('[data-force-motion-direction]').evaluate(node=>{const box=node.getBoundingClientRect();return [box.width,box.height];})).toEqual([80,24]);
    const cards=await causality.locator('[data-force-motion-contribution]').evaluateAll(nodes=>nodes.map(node=>{const box=node.getBoundingClientRect();return {left:box.left,top:box.top,bottom:box.bottom};}));expect(cards[0].left).toBeCloseTo(cards[1].left,1);expect(cards[1].top).toBeGreaterThanOrEqual(cards[0].bottom);
    await stage.screenshot({path:join(ENHANCEMENT_REPORT,'bridge-320-force-direction-tools.png')});
    const rates=causality.locator('[data-force-motion-rate-details]');await rates.locator('summary').press('Enter');await expect(rates).toHaveAttribute('open','');await rates.locator('p').scrollIntoViewIfNeeded();await expect(rates.locator('p')).toBeVisible();await stage.screenshot({path:join(ENHANCEMENT_REPORT,'bridge-320-force-exchange-tools.png')});await rates.locator('summary').press('Enter');await expect(rates).not.toHaveAttribute('open');
    expect(await drawer.evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(1);
    await lens.locator(':scope > summary').press('Escape');await expect(drawer).not.toHaveAttribute('open');await expect(summary).toBeFocused();
    await summary.press('Enter');await page.locator('[data-bridge-scene-recorder] > summary').press('Enter');
    await page.getByRole('textbox',{name:'Scene observation note',exact:true}).fill('Spring and damping can point in different directions.');
    await page.getByRole('button',{name:'Save scene observation',exact:true}).click();
    const saved=await page.evaluate(()=>(window as any).__bucket().seismicTrials[0]);expect(saved.scene.display.forceLens).toBe(true);
    await page.getByRole('button',{name:'Exit fullscreen 3D bridge (Escape)',exact:true}).click();
    await page.evaluate(()=>(window as any).__set({seismicForceLens:false,seismicTime:0,bridgeView:'2d'}));
    await page.getByRole('button',{name:'Revisit scene observation 1: Scene observation 1',exact:true}).click();
    expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({seismicForceLens:true,seismicTime:7.217,seismicPlaying:false,bridgeWalkPos:0.5});
    await summary.press('Enter');await stage.scrollIntoViewIfNeeded();await expect.poll(()=>page.evaluate(()=>(window as any).__gl().forceLensVisible)).toBe(true);
    expect(await page.evaluate(()=>(window as any).__gl().sceneBuilds)).toBe(before.sceneBuilds);
    await expect(page.locator('[data-seismic-scene-forces]')).toContainText('spring / damping / net');
    const evidence=await page.locator('[data-seismic-scene-forces]').textContent();
    await page.getByRole('button',{name:'Open earthquake evidence report',exact:true}).click();
    await expect(page.locator('[data-bridge-print-seismic] [data-seismic-scene-forces]')).toHaveText(evidence!);
    await expect(page.locator('[data-bridge-print-seismic]').locator('button,input,select,textarea')).toHaveCount(0);
    await checkWorkflowHealth(page);
  });

  test('force lens: zero shaking, graphics fallback and deliberate recovery in landscape',async ({page})=>{
    await mountWorkflow(page,844,{bridgeView:'immersive',bridgeObserver:'bank',seismicEnabled:true,seismicTime:16,seismicIntensityG:0,seismicForceLens:true,seismicSceneFocus:true,seismicReadoutCollapsed:true,crossSectionMm2:30000,lateralBraceEvery:1});
    await page.setViewportSize({width:844,height:390});const stage=page.locator('[data-allo-fs-stage]');await stage.scrollIntoViewIfNeeded();
    await page.getByRole('button',{name:'View the 3D bridge fullscreen',exact:true}).click();await checkBridgeCanvasFillsStage(page);
    await expect.poll(()=>page.evaluate(()=>(window as any).__gl().forceLensVisible)).toBe(true);
    expect(await page.evaluate(()=>(window as any).__gl().forceVectors.every((v:any)=>v.direction===0&&v.valueNPerKg===0))).toBe(true);
    await stage.screenshot({path:join(ENHANCEMENT_REPORT,'bridge-844-force-zero.png')});
    await page.evaluate(()=>{const canvas=document.querySelector('canvas[data-bridge-gl]') as HTMLCanvasElement;
      const context=canvas.getContext('webgl2')||canvas.getContext('webgl'),extension=context?.getExtension('WEBGL_lose_context');
      if(!extension)throw new Error('WebGL loss extension unavailable');(window as any).__forceLoss=extension;extension.loseContext();});
    await expect(page.locator('[data-bridge-elevation]')).toBeFocused();
    const fallback=page.locator('[data-bridge-force-lens="fallback"]');await expect(fallback).toHaveAttribute('open','');
    await expect(fallback.locator('[data-force-frame]')).toHaveAttribute('data-force-trial','current');
    expect(await fallback.locator('[data-force-reading]').evaluateAll(rows=>rows.every(row=>Number(row.getAttribute('data-force-value'))===0))).toBe(true);
    await page.evaluate(()=>(window as any).__forceLoss.restoreContext());await expect.poll(()=>page.evaluate(()=>(window as any).__gl().state)).toBe('ready');
    expect(await page.evaluate(()=>(window as any).__bucket().bridgeView)).toBe('2d');await page.getByRole('button',{name:'From the riverbank',exact:true}).click();await stage.scrollIntoViewIfNeeded();
    await expect.poll(()=>page.evaluate(()=>(window as any).__gl().forceLensVisible)).toBe(true);
    expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({seismicForceLens:true,seismicTime:16,seismicPlaying:false});
    await checkWorkflowHealth(page);
  });

  for (const size of [{width:1000,height:800},{width:320,height:568},{width:844,height:390}]) {
    test('scene focus: paired drawer, compact replay and stable graphics at '+size.width+'x'+size.height,async ({page})=>{
      await mountWorkflow(page,size.width,{bridgeView:'immersive',bridgeObserver:'bank',seismicEnabled:true,seismicGuideOpen:true,
        crossSectionMm2:30000,lateralBraceEvery:1,seismicObservation:'Keep the comparison.'});
      await page.setViewportSize(size);
      await page.getByRole('button',{name:'Prepare 5% / 20% comparison',exact:true}).click();
      const stage=page.locator('[data-allo-fs-stage]');await stage.scrollIntoViewIfNeeded();
      await page.getByRole('button',{name:'A · reference',exact:true}).click();
      await page.getByRole('combobox',{name:'Scene key moments',exact:true}).selectOption('motion');
      await page.getByRole('button',{name:'B · current',exact:true}).click();
      const time=await page.evaluate(()=>(window as any).__bucket().seismicTime);
      await expect.poll(()=>page.evaluate(()=>(window as any).__gl().comparisonOverlayVisible)).toBe(true);
      const before=await page.evaluate(()=>(window as any).__gl());
      const focusBox=await page.getByRole('button',{name:'Focus scene',exact:true}).boundingBox();
      const initialPanel=await page.locator('[data-bridge-scene-readout]').boundingBox();
      if(!focusBox||!initialPanel)throw new Error('Scene controls missing');
      expect(focusBox.x).toBeGreaterThanOrEqual(initialPanel.x+initialPanel.width+3);
      await page.getByRole('button',{name:'Focus scene',exact:true}).click();
      await expect(stage).toHaveAttribute('data-bridge-scene-focus','true');
      const drawer=page.locator('[data-bridge-scene-drawer]');
      await expect(drawer).not.toHaveAttribute('open');
      await expect(page.locator('[data-bridge-compact-comparison]')).toHaveAttribute('data-bridge-compact-comparison',String(time));
      await page.getByRole('button',{name:'View the 3D bridge fullscreen',exact:true}).click();
      await checkBridgeCanvasFillsStage(page);
      const replay=page.locator('[data-bridge-focus-replay]');
      const a=await drawer.boundingBox(),b=await replay.boundingBox();
      if(!a||!b)throw new Error('Focus panels missing');expect(a.y+a.height).toBeLessThanOrEqual(b.y-4);
      expect(await replay.evaluate(element=>element.scrollWidth-element.clientWidth)).toBeLessThanOrEqual(1);
      await expect(page.getByRole('combobox',{name:'Scene key moments',exact:true})).toHaveCount(0);
      await expect(page.getByRole('slider',{name:'Scene replay time (s)',exact:true})).toHaveCount(1);
      await page.getByRole('button',{name:'Step scene backward 0.5 s',exact:true}).click();
      expect(await page.evaluate(()=>(window as any).__bucket().seismicTime)).toBeCloseTo(time-0.5,9);
      await page.getByRole('button',{name:'Step scene forward 0.5 s',exact:true}).click();
      expect(await page.evaluate(()=>(window as any).__bucket().seismicTime)).toBeCloseTo(time,9);
      const warm=await page.evaluate(()=>(window as any).__gl());
      expect(warm.sceneBuilds).toBe(before.sceneBuilds);
      // A changed viewport or first inspected frame can bring previously culled
      // geometry into view. Verify repeated inspection after those first uploads.
      for(let cycle=0;cycle<3;cycle++){
        await page.getByRole('button',{name:'Step scene backward 0.5 s',exact:true}).click();
        await page.getByRole('button',{name:'Step scene forward 0.5 s',exact:true}).click();
      }
      expect(await page.evaluate(()=>(window as any).__gl().resources)).toEqual(warm.resources);
      expect(await page.evaluate(()=>(window as any).__gl().sceneBuilds)).toBe(before.sceneBuilds);
      await stage.screenshot({path:join(ENHANCEMENT_REPORT,'bridge-'+size.width+'x'+size.height+'-focus-scene.png')});
      const summary=drawer.locator('summary').first();
      await summary.press('Enter');await expect(drawer).toHaveAttribute('open','');
      await expect(page.getByRole('combobox',{name:'Scene key moments',exact:true})).toBeVisible();
      const expanded=await drawer.boundingBox(),replayBox=await replay.boundingBox();
      if(!expanded||!replayBox)throw new Error('Focus drawer missing');expect(expanded.y+expanded.height).toBeLessThanOrEqual(replayBox.y-4);
      expect(await drawer.evaluate(element=>element.scrollWidth-element.clientWidth)).toBeLessThanOrEqual(1);
      expect(await page.evaluate(()=>(window as any).__bucket().seismicPlaying)).toBe(false);
      await stage.screenshot({path:join(ENHANCEMENT_REPORT,'bridge-'+size.width+'x'+size.height+'-focus-tools.png')});
      await page.getByRole('combobox',{name:'Scene key moments',exact:true}).selectOption('end');
      expect(await page.evaluate(()=>(window as any).__bucket().seismicTime)).toBe(24);
      await summary.press('Enter');await expect(drawer).not.toHaveAttribute('open');
      await page.getByRole('button',{name:'Leave scene focus',exact:true}).click();
      await expect(stage).toHaveAttribute('data-bridge-scene-focus','false');
      await expect(page.getByRole('combobox',{name:'Scene key moments',exact:true})).toHaveCount(1);
      expect(await page.evaluate(()=>(window as any).__gl().sceneBuilds)).toBe(before.sceneBuilds);
      expect(await page.evaluate(()=>(window as any).__bucket().seismicObservation)).toBe('Keep the comparison.');
      await checkWorkflowHealth(page);
    });
  }

  test('scene focus: fullscreen touch walking and complete observation restoration on a phone',async ({page})=>{
    await mountWorkflow(page,320,{bridgeView:'immersive',bridgeObserver:'deck',bridgeWalkPos:0.45,seismicEnabled:true,
      seismicGuideOpen:true,crossSectionMm2:30000,lateralBraceEvery:1,designName:'Walkway study'});
    await page.setViewportSize({width:320,height:568});
    await page.getByRole('button',{name:'Prepare 5% / 20% comparison',exact:true}).click();
    await page.evaluate(()=>(window as any).__set({seismicTime:7.217}));
    const stage=page.locator('[data-allo-fs-stage]');await stage.scrollIntoViewIfNeeded();
    await page.getByRole('button',{name:'Focus scene',exact:true}).click();
    await page.getByRole('button',{name:'View the 3D bridge fullscreen',exact:true}).click();
    await checkBridgeCanvasFillsStage(page);
    const before=await page.evaluate(()=>(window as any).__gl());
    const forward=page.getByRole('button',{name:'Walk toward far end',exact:true});
    await forward.click();expect(await page.evaluate(()=>(window as any).__bucket().bridgeWalkPos)).toBe(0.5);
    await forward.click();expect(await page.evaluate(()=>(window as any).__bucket().bridgeWalkPos)).toBe(0.55);
    const back=page.getByRole('button',{name:'Walk toward entrance',exact:true});await back.click();
    expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({bridgeWalkPos:0.5,seismicTime:7.217,seismicPlaying:false});
    expect(await forward.evaluate(element=>element.getBoundingClientRect().width)).toBeGreaterThanOrEqual(44);
    expect(await back.evaluate(element=>element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(()=>(window as any).__gl().sceneBuilds)).toBe(before.sceneBuilds);
    expect(await page.evaluate(()=>(window as any).__gl().resources)).toEqual(before.resources);
    await stage.screenshot({path:join(ENHANCEMENT_REPORT,'bridge-320-focus-walkway.png')});
    const drawer=page.locator('[data-bridge-scene-drawer]');await drawer.locator('summary').first().press('Enter');
    await expect(page.locator('[data-bridge-walk-controls]')).toHaveCount(0);
    await page.locator('[data-bridge-scene-recorder] > summary').press('Enter');
    await page.getByRole('textbox',{name:'Scene observation note',exact:true}).fill('At the midpoint I can compare the railing with the dashed outline.');
    await page.getByRole('button',{name:'Save scene observation',exact:true}).click();
    const saved=await page.evaluate(()=>(window as any).__bucket().seismicTrials[0]);
    expect(saved.scene.display.focusMode).toBe(true);expect(saved.scene.walkPos).toBe(0.5);
    await page.getByRole('button',{name:'Exit fullscreen 3D bridge (Escape)',exact:true}).click();
    await page.evaluate(()=>(window as any).__set({seismicSceneFocus:false,bridgeView:'2d',bridgeWalkPos:0.12,span:20,
      seismicTime:18,seismicDampingRatio:0.3,seismicSceneCompare:false}));
    await page.getByRole('button',{name:'Revisit scene observation 1: Scene observation 1',exact:true}).click();
    await expect(page.locator('[aria-describedby="bridge-gl-description"]')).toBeFocused();
    expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({seismicSceneFocus:true,seismicReadoutCollapsed:false,
      bridgeView:'immersive',bridgeObserver:'deck',bridgeWalkPos:0.5,span:30,seismicTime:7.217,seismicDampingRatio:0.2,
      seismicSceneSource:'capture',seismicSceneCompare:true,seismicPlaying:false});
    await expect(page.getByRole('textbox',{name:'Scene observation note',exact:true})).toHaveValue(saved.observation);
    await drawer.locator('summary').first().press('Enter');
    await expect(page.locator('[data-bridge-walk-position]')).toHaveText('50%');
    await expect.poll(()=>page.evaluate(()=>(window as any).__gl().comparisonOverlayVisible)).toBe(true);
    await checkWorkflowHealth(page);
  });

  test('scene focus: keyboard drawer, reduced-motion steps and fill-frame landscape',async ({page})=>{
    await page.emulateMedia({reducedMotion:'reduce'});
    await mountWorkflow(page,844,{bridgeView:'immersive',bridgeObserver:'bank',seismicEnabled:true,seismicTime:7.217});
    await page.setViewportSize({width:844,height:390});
    const stage=page.locator('[data-allo-fs-stage]');await stage.scrollIntoViewIfNeeded();
    await page.evaluate(()=>{const stage=document.querySelector('[data-allo-fs-stage]') as any;
      stage.requestFullscreen=()=>Promise.reject(new Error('Use fill-frame for this keyboard workflow'));stage.webkitRequestFullscreen=undefined;});
    await page.getByRole('button',{name:'Focus scene',exact:true}).click();
    await page.getByRole('button',{name:'View the 3D bridge fullscreen',exact:true}).click();
    await checkBridgeCanvasFillsStage(page);
    await expect(page.getByRole('button',{name:'Replay scene',exact:true})).toBeDisabled();
    await page.getByRole('button',{name:'Step scene forward 0.5 s',exact:true}).click();
    expect(await page.evaluate(()=>(window as any).__bucket().seismicTime)).toBeCloseTo(7.717,9);
    const drawer=page.locator('[data-bridge-scene-drawer]'),summary=drawer.locator('summary').first();
    await summary.press('Enter');
    const moments=page.getByRole('combobox',{name:'Scene key moments',exact:true});await moments.focus();await moments.press('Escape');
    await expect(drawer).not.toHaveAttribute('open');await expect(summary).toBeFocused();
    await expect(page.getByRole('button',{name:'Exit fullscreen 3D bridge (Escape)',exact:true})).toHaveAttribute('aria-pressed','true');
    await summary.press('Enter');await page.locator('[data-bridge-scene-recorder] > summary').press('Enter');
    const note=page.getByRole('textbox',{name:'Scene observation note',exact:true});await note.fill('Keyboard inspection remains available.');
    await note.press('Escape');await expect(drawer).not.toHaveAttribute('open');await expect(summary).toBeFocused();
    expect(await page.evaluate(()=>(window as any).__bucket().seismicSceneNote)).toBe('Keyboard inspection remains available.');
    await page.getByRole('button',{name:'Exit fullscreen 3D bridge (Escape)',exact:true}).click();
    await checkWorkflowHealth(page);
  });

  test('scene focus: graphics recovery preserves the layout and paused phone observation',async ({page})=>{
    await mountWorkflow(page,320,{bridgeView:'immersive',bridgeObserver:'deck',seismicEnabled:true,seismicTime:7.217,
      seismicSceneNote:'Keep my scene draft.',seismicSceneFocus:true,seismicReadoutCollapsed:true});
    await page.setViewportSize({width:320,height:568});const stage=page.locator('[data-allo-fs-stage]');await stage.scrollIntoViewIfNeeded();
    await page.getByRole('button',{name:'View the 3D bridge fullscreen',exact:true}).click();
    await page.getByRole('button',{name:'Leave scene focus',exact:true}).focus();
    await page.evaluate(()=>{const canvas=document.querySelector('canvas[data-bridge-gl]') as HTMLCanvasElement;
      const context=canvas.getContext('webgl2')||canvas.getContext('webgl'),extension=context?.getExtension('WEBGL_lose_context');
      if(!extension)throw new Error('WebGL loss extension unavailable');(window as any).__focusLoss=extension;extension.loseContext();});
    await expect(page.locator('[data-bridge-elevation]')).toBeFocused();
    expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({bridgeView:'2d',seismicSceneFocus:true,seismicTime:7.217,
      seismicPlaying:false,seismicSceneNote:'Keep my scene draft.'});
    await page.evaluate(()=>(window as any).__focusLoss.restoreContext());await expect.poll(()=>page.evaluate(()=>(window as any).__gl().state)).toBe('ready');
    expect(await page.evaluate(()=>(window as any).__bucket().bridgeView)).toBe('2d');
    await page.getByRole('button',{name:'On the bridge',exact:true}).click();await stage.scrollIntoViewIfNeeded();
    await expect(page.locator('[data-bridge-focus-replay]')).toBeVisible();
    await expect(page.getByRole('button',{name:'Walk toward far end',exact:true})).toBeVisible();
    expect(await page.evaluate(()=>(window as any).__bucket().seismicPlaying)).toBe(false);
    await checkWorkflowHealth(page);
  });

  for (const width of [1000,320]) {
    test('simultaneous responses: shared frame, stable resources and complete snapshot at '+width+'px',async ({page})=>{
      const design={span:40,height:8,nBays:6,trussStyle:'pratt',materialId:'steel',crossSectionMm2:30000,
        loadMode:'vehicle',loadPerJoint:73,vehicleLoad:220,vehiclePos:0.37,lateralBraceEvery:1};
      await mountWorkflow(page,width,{...design,bridgeView:'immersive',bridgeObserver:'bank',seismicEnabled:true,seismicGuideOpen:true,
        designName:'Classroom crossing',designNotes:'Inspect the deck against the banks.'});
      await page.getByRole('button',{name:'Prepare 5% / 20% comparison',exact:true}).click();
      const stage=page.locator('[data-allo-fs-stage]'); await stage.scrollIntoViewIfNeeded();
      await page.getByRole('button',{name:'A · reference',exact:true}).click();
      await page.getByRole('combobox',{name:'Scene key moments',exact:true}).selectOption('motion');
      const time=await page.evaluate(()=>(window as any).__bucket().seismicTime);
      await page.getByRole('button',{name:'B · current',exact:true}).click();
      const readings=page.locator('[data-bridge-overlay-readings]');
      await expect(readings).toHaveAttribute('data-bridge-overlay-readings',String(time));
      await expect.poll(()=>page.evaluate(()=>(window as any).__gl().comparisonOverlayVisible)).toBe(true);
      await expect.poll(()=>page.evaluate(()=>(window as any).__gl().comparisonOutlineTrial)).toBe('reference');
      const expected=await page.evaluate(()=>(window as any).__gl());
      expect(expected.comparisonReferenceM).not.toBe(expected.comparisonCurrentM);
      expect(expected.comparisonOutlinePosition[2]).toBeCloseTo(expected.comparisonReferenceM*10,8);
      expect(expected.deckOffsetM).toBeCloseTo(expected.comparisonCurrentM,12);
      expect(expected.comparisonTrailSamples).toBe(31);
      await page.getByRole('button',{name:'A · reference',exact:true}).click();
      await expect.poll(()=>page.evaluate(()=>(window as any).__gl().comparisonOutlineTrial)).toBe('current');
      await page.getByRole('button',{name:'B · current',exact:true}).click();
      await expect.poll(()=>page.evaluate(()=>(window as any).__gl().comparisonOutlineTrial)).toBe('reference');
      const warm=await page.evaluate(()=>(window as any).__gl());
      for(let i=0;i<8;i++){
        await page.getByRole('button',{name:'Show both responses',exact:true}).click();
        await expect.poll(()=>page.evaluate(()=>(window as any).__gl().comparisonOverlayVisible)).toBe(i%2!==0);
        await page.evaluate(t=>(window as any).__set({seismicTime:t}),time+i*0.05);
      }
      await page.evaluate(t=>(window as any).__set({seismicTime:t}),time);
      await expect.poll(()=>page.evaluate(()=>(window as any).__gl().comparisonReferenceM)).toBeCloseTo(expected.comparisonReferenceM,12);
      const after=await page.evaluate(()=>(window as any).__gl());
      expect(after.sceneBuilds).toBe(warm.sceneBuilds); expect(after.resources).toEqual(warm.resources);
      await page.getByRole('button',{name:'View the 3D bridge fullscreen',exact:true}).click();
      await checkBridgeCanvasFillsStage(page);
      await stage.screenshot({path:join(ENHANCEMENT_REPORT,'bridge-'+width+'-simultaneous-responses.png')});
      const measurementToggle=page.locator('[data-bridge-scene-readout] > summary');
      await measurementToggle.press('Enter');
      await expect(page.locator('[data-bridge-compact-comparison]')).toHaveAttribute('data-bridge-compact-comparison',String(time));
      await expect(page.locator('[data-compact-response=reference]')).toContainText('outline');
      await expect(page.locator('[data-compact-response=current]')).toContainText('solid');
      await stage.screenshot({path:join(ENHANCEMENT_REPORT,'bridge-'+width+'-simultaneous-compact.png')});
      await measurementToggle.press('Enter');
      await expect(readings).toHaveAttribute('data-bridge-overlay-readings',String(time));
      const panel=await page.locator('[data-bridge-scene-readout]').boundingBox(),replay=await page.locator('[data-bridge-scene-replay]').boundingBox();
      if(!panel||!replay)throw new Error('Scene panels missing'); expect(panel.y+panel.height).toBeLessThanOrEqual(replay.y-4);
      await page.locator('[data-bridge-scene-recorder] > summary').press('Enter');
      await page.getByRole('textbox',{name:'Scene observation note',exact:true}).fill('The reference moves farther under the same ground motion.');
      await page.getByRole('button',{name:'Save scene observation',exact:true}).click();
      const saved=await page.evaluate(()=>(window as any).__bucket().seismicTrials[0]);
      expect(saved.scene.design.inputs).toEqual(design);
      expect(saved.scene.comparison).toMatchObject({referenceInputs:{dampingRatio:0.05},currentInputs:{dampingRatio:0.2}});
      await page.getByRole('button',{name:'Exit fullscreen 3D bridge (Escape)',exact:true}).click();
      await page.evaluate(()=>(window as any).__set({span:20,height:3,nBays:4,materialId:'wood',trussStyle:'howe',crossSectionMm2:1000,
        loadMode:'uniform',loadPerJoint:1,vehicleLoad:40,vehiclePos:0.9,lateralBraceEvery:2,bridgeView:'2d',
        designName:'Changed',designNotes:'Changed',seismicTime:18,seismicDampingRatio:0.3,seismicFrequencyHz:2,
        seismicIntensityG:0.2,seismicSceneCompare:false,seismicSceneOverlay:false,seismicGuideBaseline:null}));
      await page.getByRole('button',{name:'Revisit scene observation 1: Scene observation 1',exact:true}).click();
      await expect(page.locator('[aria-describedby="bridge-gl-description"]')).toBeFocused();
      const restored=await page.evaluate(()=>(window as any).__bucket());
      expect(restored).toMatchObject({...design,designName:'Classroom crossing',designNotes:'Inspect the deck against the banks.',
        seismicTime:time,seismicDampingRatio:0.2,seismicFrequencyHz:1.1,seismicIntensityG:0.12,
        seismicSceneCompare:true,seismicSceneSource:'capture',seismicSceneTrial:'current',seismicSceneOverlay:true,seismicPlaying:false});
      await expect.poll(()=>page.evaluate(()=>(window as any).__gl().comparisonOverlayVisible)).toBe(true);
      const reproduced=await page.evaluate(()=>(window as any).__gl());
      expect(reproduced.extent).toEqual(expected.extent);
      expect(reproduced.comparisonReferenceM).toBeCloseTo(expected.comparisonReferenceM,12);
      expect(reproduced.comparisonCurrentM).toBeCloseTo(expected.comparisonCurrentM,12);
      const motion=await page.locator('[data-seismic-scene-pair-motion]').textContent();
      await page.getByRole('button',{name:'Open earthquake evidence report',exact:true}).click();
      const report=page.locator('[data-bridge-print-seismic]');
      await expect(report.locator('[data-seismic-scene-design]')).toContainText('40 m × 8 m');
      await expect(report).toContainText('Classroom crossing');
      await expect(report.locator('[data-seismic-scene-pair-motion]')).toHaveText(motion!);
      await expect(report.locator('button,input,textarea,select')).toHaveCount(0);
      await captureImmersiveRegion(page,report,'bridge-'+width+'-complete-scene-report.png',ENHANCEMENT_REPORT);
      await checkWorkflowHealth(page);
    });
  }

  test('simultaneous responses: matching motion, reduced-motion inspection and captured A/B graphics recovery',async ({page})=>{
    await page.emulateMedia({reducedMotion:'reduce'});
    await mountWorkflow(page,1000,{span:40,bridgeView:'immersive',bridgeObserver:'bank',seismicEnabled:true,seismicGuideOpen:true});
    await page.getByRole('button',{name:'Prepare 5% / 20% comparison',exact:true}).click();
    const stage=page.locator('[data-allo-fs-stage]'); await stage.scrollIntoViewIfNeeded();
    await page.evaluate(()=>(window as any).__set({seismicTime:7.217,seismicFrequencyHz:1.4}));
    await expect(page.getByRole('button',{name:'Show both responses',exact:true})).toBeDisabled();
    await expect.poll(()=>page.evaluate(()=>(window as any).__gl().comparisonOverlayVisible)).toBe(false);
    await page.evaluate(()=>(window as any).__set({seismicFrequencyHz:1.1}));
    await expect.poll(()=>page.evaluate(()=>(window as any).__gl().comparisonOverlayVisible)).toBe(true);
    await expect(page.getByRole('button',{name:'Replay scene',exact:true})).toBeDisabled();
    await page.getByRole('button',{name:'A · reference',exact:true}).click();
    await page.getByRole('button',{name:'View the 3D bridge fullscreen',exact:true}).click();
    await page.locator('[data-bridge-scene-recorder] > summary').press('Enter');
    await page.getByRole('textbox',{name:'Scene observation note',exact:true}).fill('A and B share the ground motion.');
    await page.getByRole('button',{name:'Save scene observation',exact:true}).click();
    await page.evaluate(()=>{
      const canvas=document.querySelector('canvas[data-bridge-gl]') as HTMLCanvasElement;
      const context=canvas.getContext('webgl2')||canvas.getContext('webgl');const extension=context?.getExtension('WEBGL_lose_context');
      if(!extension)throw new Error('WebGL loss extension unavailable');(window as any).__pairLoss=extension;extension.loseContext();
    });
    await expect(page.locator('[data-bridge-elevation]')).toBeFocused();
    await page.evaluate(()=>(window as any).__set({span:25,seismicTime:18,seismicDampingRatio:0.3}));
    await page.getByRole('button',{name:'Revisit scene observation 1: Scene observation 1',exact:true}).click();
    await expect(page.locator('[data-bridge-elevation]')).toBeFocused();
    expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({span:40,bridgeView:'2d',seismicTime:7.217,
      seismicDampingRatio:0.2,seismicSceneCompare:true,seismicSceneTrial:'reference',seismicSceneSource:'capture',seismicPlaying:false});
    await page.evaluate(()=>(window as any).__pairLoss.restoreContext());
    await expect.poll(()=>page.evaluate(()=>(window as any).__gl().state)).toBe('ready');
    expect(await page.evaluate(()=>(window as any).__bucket().bridgeView)).toBe('2d');
    await page.getByRole('button',{name:'From the riverbank',exact:true}).click();await stage.scrollIntoViewIfNeeded();
    await expect.poll(()=>page.evaluate(()=>(window as any).__gl().comparisonOverlayVisible)).toBe(true);
    await expect.poll(()=>page.evaluate(()=>(window as any).__gl().comparisonOutlineTrial)).toBe('current');
    await expect(page.getByRole('button',{name:'Replay scene',exact:true})).toBeDisabled();
    await checkWorkflowHealth(page);
  });

  for (const width of [1000, 320]) {
    test('scene observations: record reference A, revisit the bank and print at ' + width + 'px', async ({ page }) => {
      await mountWorkflow(page,width,{bridgeView:'immersive',bridgeObserver:'bank',bridgeBankYaw:18,bridgeBankPitch:-8,
        seismicEnabled:true,seismicGuideOpen:true,seismicPrediction:'B prediction stays here',seismicObservation:'B explanation stays here'});
      await page.getByRole('button',{name:'Prepare 5% / 20% comparison',exact:true}).click();
      await page.evaluate(() => (window as any).__set({seismicTime:7.217}));
      const stage=page.locator('[data-allo-fs-stage]');
      await stage.scrollIntoViewIfNeeded();
      await page.getByRole('button',{name:'A · reference',exact:true}).click();
      await page.getByRole('button',{name:'View the 3D bridge fullscreen',exact:true}).click();
      await checkBridgeCanvasFillsStage(page);
      await page.getByRole('button',{name:'Replay scene',exact:true}).click();
      await expect.poll(() => page.evaluate(() => (window as any).__bucket().seismicPlaying)).toBe(true);
      const recorder=page.locator('[data-bridge-scene-recorder]');
      await recorder.locator('summary').press('Enter');
      await expect.poll(() => page.evaluate(() => (window as any).__bucket().seismicPlaying)).toBe(false);
      await page.evaluate(() => (window as any).__set({seismicTime:7.217}));
      const note='From the bank, the deck moves relative to the ground.\nThe damper transfers stored energy into dissipated energy.';
      await page.getByRole('textbox',{name:'Scene observation note',exact:true}).fill(note);
      await expect(recorder.locator('[data-scene-record-context]')).toHaveText('A · reference · 7.217 s');
      await page.locator('[data-bridge-scene-readout]').evaluate(element => {element.scrollTop=0;});
      await stage.screenshot({path:join(ENHANCEMENT_REPORT,'bridge-'+width+'-scene-observation.png')});
      const panel=await page.locator('[data-bridge-scene-readout]').boundingBox();
      const replay=await page.locator('[data-bridge-scene-replay]').boundingBox();
      if(!panel||!replay)throw new Error('Scene controls missing');
      expect(panel.y+panel.height).toBeLessThanOrEqual(replay.y-4);
      await page.getByRole('button',{name:'Save scene observation',exact:true}).click();
      await expect(recorder.locator('[data-scene-record-saved]')).toContainText('saved in the earthquake notebook');
      const bucket=await page.evaluate(() => (window as any).__bucket());
      expect(bucket).toMatchObject({seismicDampingRatio:0.2,seismicSceneTrial:'reference',seismicTime:7.217,
        seismicPlaying:false,seismicPrediction:'B prediction stays here',seismicObservation:'B explanation stays here'});
      const record=bucket.seismicTrials[0];
      expect(record).toMatchObject({timeS:7.217,prediction:'',observation:note,inputs:{dampingRatio:0.05},
        scene:{source:'reference',view:'immersive',observer:'bank',bankYaw:18,bankPitch:-8}});
      await page.getByRole('button',{name:'Exit fullscreen 3D bridge (Escape)',exact:true}).click();
      const card=page.locator('[data-seismic-trial="0"]');
      await expect(card).toContainText('Captured from the reference scene · Riverbank viewpoint');
      const power=await card.locator('[data-seismic-scene-power]').textContent();
      await page.evaluate(() => (window as any).__set({bridgeView:'2d',bridgeObserver:'deck',bridgeBankYaw:-30,bridgeBankPitch:20,
        seismicTime:18,seismicDampingRatio:0.3,seismicSceneCompare:true,seismicSceneTrial:'reference'}));
      await page.getByRole('button',{name:'Revisit scene observation 1: Scene observation 1',exact:true}).click();
      const view=page.locator('[aria-describedby="bridge-gl-description"]');
      await expect(view).toBeFocused();
      await expect.poll(() => page.evaluate(() => (window as any).__gl().observerAnchor)).toBe('ground');
      expect(await page.evaluate(() => (window as any).__bucket())).toMatchObject({bridgeView:'immersive',bridgeObserver:'bank',
        bridgeBankYaw:18,bridgeBankPitch:-8,seismicTime:7.217,seismicDampingRatio:0.2,seismicSceneCompare:true,
        seismicSceneSource:'capture',seismicSceneTrial:'reference',seismicSceneNote:note,seismicPlaying:false});
      await expect(page.getByRole('textbox',{name:'Scene observation note',exact:true})).toHaveValue(note);
      await page.getByRole('button',{name:'Open earthquake evidence report',exact:true}).click();
      const report=page.locator('[data-bridge-print-seismic]');
      await expect(report).toContainText('Inspected time: 7.217 s');
      await expect(report).toContainText(note.replaceAll('\n',' '));
      await expect(report.locator('[data-seismic-scene-power]')).toHaveText(power!);
      await expect(report.locator('button,input,textarea,select')).toHaveCount(0);
      await captureImmersiveRegion(page,report,'bridge-'+width+'-scene-observation-report.png',ENHANCEMENT_REPORT);
      await checkWorkflowHealth(page);
    });
  }

  test('scene observations: graphics loss preserves the saved pose and focused fallback until deliberate recovery', async ({page}) => {
    await mountWorkflow(page,1000,{bridgeView:'immersive',bridgeObserver:'bank',bridgeBankYaw:18,bridgeBankPitch:-8,
      seismicEnabled:true,seismicTime:7.217,seismicSceneRecording:true,seismicSceneNote:'Watch the ground and the deck.'});
    await page.getByRole('button',{name:'Save scene observation',exact:true}).click();
    await page.evaluate(() => {
      const canvas=document.querySelector('canvas[data-bridge-gl]') as HTMLCanvasElement;
      const context=canvas.getContext('webgl2')||canvas.getContext('webgl');
      const extension=context?.getExtension('WEBGL_lose_context');
      if(!extension)throw new Error('WebGL loss extension unavailable');
      (window as any).__sceneRecordLoss=extension; extension.loseContext();
    });
    await expect(page.locator('[data-bridge-elevation]')).toBeVisible();
    await page.evaluate(() => (window as any).__set({seismicTime:18,bridgeBankYaw:-30}));
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.getByRole('button',{name:'Revisit scene observation 1: Scene observation 1',exact:true}).click();
    await expect(page.locator('[data-bridge-elevation]')).toBeFocused();
    expect(await page.evaluate(() => (window as any).__bucket())).toMatchObject({bridgeView:'2d',bridgeObserver:'bank',
      bridgeBankYaw:18,bridgeBankPitch:-8,seismicTime:7.217,seismicPlaying:false});
    await page.evaluate(() => (window as any).__sceneRecordLoss.restoreContext());
    await expect.poll(() => page.evaluate(() => (window as any).__gl().state)).toBe('ready');
    expect(await page.evaluate(() => (window as any).__bucket().bridgeView)).toBe('2d');
    await page.getByRole('button',{name:'From the riverbank',exact:true}).click();
    await page.locator('[data-allo-fs-stage]').scrollIntoViewIfNeeded();
    await expect.poll(() => page.evaluate(() => (window as any).__gl().observerAnchor)).toBe('ground');
    await expect(page.getByRole('button',{name:'Replay scene',exact:true})).toBeDisabled();
    await expect(page.getByRole('textbox',{name:'Scene observation note',exact:true})).toHaveValue('Watch the ground and the deck.');
    await checkWorkflowHealth(page);
  });

  for (const width of [1000, 320]) {
    test('transfer magnitude: shared event scale and accurate rates at ' + width + 'px', async ({ page }) => {
      const oracle = await loadFrameEnergyOracle();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await mountWorkflow(page, width, { bridgeView: 'immersive', bridgeObserver: 'bank', seismicEnabled: true,
        seismicEnergyFlow: true, seismicGuideOpen: true, seismicTime: 7.217, seismicSceneNote: 'Keep this explanation.' });
      await page.getByRole('button', { name: 'From the riverbank', exact: true }).click();
      await page.getByRole('button', { name: 'Prepare 5% / 20% comparison', exact: true }).click();
      const inputs = await guidePairInputs(page), responses = inputs.map(input => oracle.bridgeSeismicResponse(input));
      const frame = page.locator('[data-flow-frame]'), records: any[] = [];
      const fields = { input: 'inputPowerWPerKg', exchange: 'elasticPowerWPerKg', damping: 'dampingPowerWPerKg' };
      // Independent full-recording bound; never call the UI's scale helper.
      const peak = (response: any) => response.samples.reduce((max: number, point: any) =>
        Math.max(max, ...Object.values(fields).map(field => Math.abs(point[field]))), 0);
      async function check(name: string, response: any, other: any, time: number, trial = 'current') {
        await expect(frame).toHaveAttribute('data-flow-frame', String(time));
        await expect(frame).toHaveAttribute('data-flow-trial', trial);
        const before = await page.evaluate(() => JSON.stringify((window as any).__bucket()));
        const point = oracle.bridgeSeismicSample(response, time), maximum = Math.max(peak(response), other ? peak(other) : 0);
        const actualMaximum = Number(await frame.getAttribute('data-flow-maximum-w-per-kg'));
        const limit = Number(await frame.getAttribute('data-flow-scale-w-per-kg'));
        if (maximum === 0) { expect(actualMaximum).toBe(0); expect(limit).toBe(1); }
        else { expect(Math.abs(actualMaximum - maximum)).toBeLessThanOrEqual(maximum * 2e-10); expect(limit).toBe(actualMaximum); }
        await expect(frame.locator('[data-flow-magnitude]')).toHaveCount(3);
        const geometry: any[] = [];
        for (const [id, field] of Object.entries(fields)) {
          const expected = point[field], row = frame.locator('[data-flow-path="' + id + '"]');
          const power = Number(await row.getAttribute('data-flow-power'));
          if (expected === 0) expect(power).toBe(0);
          else expect(Math.abs(power - expected)).toBeLessThanOrEqual(peak(response) * 2e-10);
          await expect(row).toHaveAttribute('data-flow-direction', String(Math.sign(power)));
          await expect(row.locator('[data-flow-rate] strong')).toHaveText(frameEnergyNumber(Math.abs(power)) + ' W/kg');
          const bar = row.locator('[data-flow-magnitude]'), track = row.locator('[data-flow-magnitude-track]');
          await expect(track).toHaveAttribute('aria-hidden', 'true');
          expect(Number(await bar.getAttribute('data-flow-magnitude-value'))).toBe(Math.abs(power));
          const fraction = Number(await bar.getAttribute('data-flow-magnitude-fraction'));
          expect(fraction).toBe(Math.abs(power) / limit); expect(fraction).toBeGreaterThanOrEqual(0); expect(fraction).toBeLessThanOrEqual(1);
          const box = await track.evaluate(node => {
            const track = node as HTMLElement, fill = track.querySelector('[data-flow-magnitude]') as HTMLElement;
            const rect = track.getBoundingClientRect(), style = getComputedStyle(track), bar = fill.getBoundingClientRect();
            return { width: rect.width, content: rect.width - parseFloat(style.borderLeftWidth) - parseFloat(style.borderRightWidth),
              fillWidth: bar.width, percent: parseFloat(fill.style.width), minWidth: fill.style.minWidth,
              ticks: [...track.querySelectorAll('span')].map(n => (n as HTMLElement).style.left), overflow: track.scrollWidth - track.clientWidth };
          });
          if (fraction === 0) expect(box.fillWidth).toBe(0);
          expect(Math.abs(box.fillWidth - box.content * fraction)).toBeLessThanOrEqual(0.04);
          expect(box.minWidth).toBe(''); expect(box.ticks).toEqual(['25%', '50%', '75%']); expect(box.overflow).toBeLessThanOrEqual(1);
          geometry.push({ id, power, fraction, ...box });
          const arrow = row.locator('[data-flow-arrow]');
          if (power === 0) await expect(arrow.locator('path')).toHaveCount(0);
          else await expect(arrow.locator('path')).toHaveAttribute('d', power > 0 ? 'M32 5 L40 12 L32 19' : 'M12 5 L4 12 L12 19');
        }
        expect(Math.max(...geometry.map(row => row.width)) - Math.min(...geometry.map(row => row.width))).toBeLessThanOrEqual(0.1);
        const caption = frame.locator('[data-flow-scale-caption]');
        await expect(caption).toHaveText(maximum === 0 ? 'No energy transfer is recorded during this experiment.'
          : 'Each bar: 0 — ' + frameEnergyNumber(actualMaximum) + ' W/kg · ' + (other ? 'fixed for A and B' : 'fixed for this experiment'));
        expect(await caption.evaluate(node => !node.closest('svg,[aria-hidden="true"]'))).toBe(true);
        await expect(frame.locator('[data-flow-magnitude-help]')).toContainText('regardless of direction');
        await expect(frame.locator('[data-flow-group="external"] [data-flow-path]')).toHaveCount(2);
        await expect(frame.locator('[data-flow-group="internal"] [data-flow-path]')).toHaveCount(1);
        const stored = Number(await frame.locator('[data-flow-stored-rate]').getAttribute('data-flow-stored-rate'));
        expect(Math.abs(stored - point.storedPowerWPerKg)).toBeLessThanOrEqual(peak(response) * 2e-10);
        expect(await frame.evaluate(node => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1);
        expect(await page.evaluate(() => JSON.stringify((window as any).__bucket()))).toBe(before);
        records.push({ name, trial, time, maximum: actualMaximum, limit, geometry });
        return actualMaximum;
      }
      const moments = ['inputPowerWPerKg', 'elasticPowerWPerKg'].flatMap(field => [1, -1].map(sign =>
        responses[1].samples.reduce((best: any, point: any) => point[field] * sign > best[field] * sign ? point : best).timeS));
      let fixedScale = 0;
      for (const [index, time] of moments.entries()) {
        await page.evaluate(time => (window as any).__set({ seismicTime: time }), time);
        const max = await check('B direction ' + index, responses[1], responses[0], time);
        if (index === 0) fixedScale = max; else expect(max).toBe(fixedScale);
      }
      await captureNativeEnergyFlow(page, frame, 'transfer-magnitude-' + width + '-paired.png');
      await page.getByRole('button', { name: 'A · reference', exact: true }).click();
      expect(await check('A same clock', responses[0], responses[1], moments[3], 'reference')).toBe(fixedScale);
      await page.evaluate(() => (window as any).__set({ seismicTime: 0, seismicIntervalPinS: 19.12345 }));
      expect(await check('A at rest', responses[0], responses[1], 0, 'reference')).toBe(fixedScale);
      const disclosure = page.locator('[data-bridge-energy-flow="scene"] > summary');
      const closedState = await page.evaluate(() => (window as any).__bucket());
      await disclosure.press('Enter'); await expect(frame).toHaveCount(0);
      expect(await page.evaluate(() => (window as any).__bucket())).toEqual({ ...closedState, seismicEnergyFlow: false });
      await disclosure.press('Enter'); await expect(frame).toHaveCount(1);
      expect(await page.evaluate(() => (window as any).__bucket())).toEqual(closedState);
      await page.evaluate(() => (window as any).__set({ seismicSceneCompare: false, seismicSceneTrial: 'current', seismicDampingRatio: 0, seismicTime: 18 }));
      await check('undamped free vibration', oracle.bridgeSeismicResponse(await flowCurrentInputs(page)), null, 18);
      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 0.000001, seismicDampingRatio: 0.2, seismicTime: 7.217, seismicSceneCompare: true, seismicSceneTrial: 'reference' }));
      const tiny = oracle.bridgeSeismicResponse(await flowCurrentInputs(page));
      await check('A with tiny B', responses[0], tiny, 7.217, 'reference');
      await page.getByRole('button', { name: 'B · current', exact: true }).click();
      await check('tiny B with A', tiny, responses[0], 7.217);
      await page.getByRole('button', { name: 'Labelled 2D view', exact: true }).click();
      const tinyScale = await check('tiny fallback', tiny, null, 7.217);
      expect(tinyScale).toBeGreaterThan(0); expect(tinyScale).toBeLessThan(0.001);
      await captureNativeEnergyFlow(page, frame, 'transfer-magnitude-' + width + '-fallback.png');
      await page.evaluate(() => (window as any).__set({ seismicTime: 0 }));
      expect(await check('tiny at rest', tiny, null, 0)).toBe(tinyScale);
      await expect(frame.locator('[data-flow-scientific-help]')).toHaveCount(1);
      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 0, seismicTime: 18 }));
      await check('zero event', oracle.bridgeSeismicResponse(await flowCurrentInputs(page)), null, 18);
      await captureNativeEnergyFlow(page, frame, 'transfer-magnitude-' + width + '-zero.png');
      expect(await page.evaluate(() => (window as any).__bucket().seismicSceneNote)).toBe('Keep this explanation.');
      await mkdir(ENHANCEMENT_REPORT, { recursive: true });
      await writeFile(join(ENHANCEMENT_REPORT, 'transfer-magnitude-' + width + '-state.json'), JSON.stringify({ width, checks: records.length, records }, null, 2));
      await checkWorkflowHealth(page);
    });
  }

  for (const width of [1000, 320]) {
    test('energy transfer: signed arrows, A/B power and fullscreen at ' + width + 'px', async ({ page }) => {
      const oracle = await loadGuideEnergyOracle();
      await mountWorkflow(page, width, { bridgeView: 'immersive', bridgeObserver: 'bank', seismicEnabled: true,
        seismicGuideOpen: true, seismicTime: 7.283333333333333, crossSectionMm2: 30000, lateralBraceEvery: 1,
        seismicObservation: 'Trace the energy.' });
      // Choose the intended view after startup graphics recovery, which can
      // deliberately leave the product in its readable 2D fallback.
      await page.getByRole('button', { name: 'From the riverbank', exact: true }).click();
      const stage = page.locator('[data-allo-fs-stage]');
      const disclosure = page.locator('[data-bridge-energy-flow="scene"]');
      const frame = page.locator('[data-flow-frame]');
      await expect(frame).toHaveCount(0);
      await disclosure.locator('summary').press('Enter');
      await expect(frame.locator('[data-flow-path="input"]')).toHaveAttribute('data-flow-direction', '-1');
      await expect(frame.locator('[data-flow-diagram]')).toHaveAttribute('aria-label', /Stored → Ground interaction/);
      await expect(frame.locator('[data-flow-stored-rate]')).toContainText('Stored energy decreasing');
      const before = await page.evaluate(() => (window as any).__gl());
      await checkNativeEnergyFlow(frame, oracle, await flowCurrentInputs(page), 7.283333333333333);
      await page.getByRole('button', { name: 'Prepare 5% / 20% comparison', exact: true }).click();
      await page.evaluate(() => (window as any).__set({ seismicTime: 7.217 }));
      await stage.scrollIntoViewIfNeeded();
      const pair = await guidePairInputs(page);
      const b = await checkNativeEnergyFlow(frame, oracle, pair[1], 7.217);
      await page.getByRole('button', { name: 'A · reference', exact: true }).click();
      await expect(frame).toHaveAttribute('data-flow-trial', 'reference');
      const a = await checkNativeEnergyFlow(frame, oracle, pair[0], 7.217);
      expect(a.rates).not.toEqual(b.rates);
      await page.getByRole('button', { name: 'B · current', exact: true }).click();
      expect(await checkNativeEnergyFlow(frame, oracle, pair[1], 7.217)).toEqual(b);
      await captureNativeEnergyFlow(page, frame, 'energy-transfer-' + width + '-native.png');
      await page.getByRole('button', { name: 'Save earthquake trial', exact: true }).click();
      const saved = await page.evaluate(() => (window as any).__bucket().seismicTrials[0]);
      expect(saved.inputs).toMatchObject(await flowCurrentInputs(page));
      await page.getByRole('button', { name: 'View the 3D bridge fullscreen', exact: true }).click();
      await checkBridgeCanvasFillsStage(page);
      await page.locator('[data-bridge-scene-readout]').evaluate(el => { el.scrollTop = 0; });
      await stage.screenshot({ path: join(ENHANCEMENT_REPORT, 'bridge-' + width + '-energy-transfer.png') });
      const panel = await page.locator('[data-bridge-scene-readout]').boundingBox();
      const replay = await page.locator('[data-bridge-scene-replay]').boundingBox();
      if (!panel || !replay) throw new Error('Scene controls missing');
      expect(panel.y + panel.height).toBeLessThanOrEqual(replay.y - 4);
      await page.locator('[data-bridge-scene-readout] > summary').press('Enter');
      await expect(frame).toHaveCount(0);
      await page.locator('[data-bridge-scene-readout] > summary').press('Enter');
      expect(await checkNativeEnergyFlow(frame, oracle, pair[1], 7.217)).toEqual(b);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.getByRole('combobox', { name: 'Scene key moments', exact: true }).selectOption('free');
      await expect(frame.locator('[data-flow-path="input"]')).toHaveAttribute('data-flow-direction', '0');
      await checkNativeEnergyFlow(frame, oracle, pair[1], 16);
      await page.evaluate(() => (window as any).__set({ seismicDampingRatio: 0, seismicTime: 18 }));
      const undamped = await checkNativeEnergyFlow(frame, oracle, await flowCurrentInputs(page), 18);
      expect(undamped.stored).toBe(0);
      expect(undamped.rates.input).toBe(0);
      expect(undamped.rates.damping).toBe(0);
      expect(undamped.rates.exchange).not.toBe(0);
      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 0 }));
      const zero = await checkNativeEnergyFlow(frame, oracle, await flowCurrentInputs(page), 18);
      expect(Object.values(zero.rates)).toEqual([0, 0, 0]);
      expect(zero.description).toContain('No transfer');
      await page.getByRole('button', { name: 'Exit fullscreen 3D bridge (Escape)', exact: true }).click();

      // A saved normal-amplitude trial and a tiny current trial share one clock.
      // Arrow length conveys direction only, so unequal rates keep the same
      // visible geometry while their native numerical readings stay distinct.
      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 0.000001, seismicDampingRatio: 0.2,
        seismicTime: 7.217, seismicSceneCompare: true, seismicSceneSource: 'saved', seismicSceneTrial: 'current' }));
      const tinyInputs = await flowCurrentInputs(page);
      const tiny = await checkNativeEnergyFlow(frame, oracle, tinyInputs, 7.217);
      for (const id of ['input', 'exchange', 'damping'] as FlowPath[]) {
        expect(Math.abs(tiny.rates[id])).toBeGreaterThan(0);
        expect(Math.abs(tiny.rates[id])).toBeLessThan(0.001);
        expect(tiny.arrows[id]).toEqual(b.arrows[id]);
        expect(Math.abs(tiny.rates[id] / b.rates[id] - Math.pow(0.000001 / 0.12, 2))).toBeLessThan(1e-18);
      }
      await expect(frame.locator('[data-flow-scientific-help]')).toBeVisible();
      await captureNativeEnergyFlow(page, frame, 'energy-transfer-' + width + '-tiny.png');
      await page.getByRole('button', { name: 'A · reference', exact: true }).click();
      const savedA = await checkNativeEnergyFlow(frame, oracle, saved.inputs, 7.217);
      expect(savedA.rates).toEqual(b.rates);
      await page.getByRole('button', { name: 'On the bridge', exact: true }).click();
      expect(await checkNativeEnergyFlow(frame, oracle, saved.inputs, 7.217)).toEqual(savedA);
      await page.getByRole('button', { name: '3D structure', exact: true }).click();
      expect(await checkNativeEnergyFlow(frame, oracle, saved.inputs, 7.217)).toEqual(savedA);
      await page.getByRole('button', { name: 'B · current', exact: true }).click();
      expect(await checkNativeEnergyFlow(frame, oracle, tinyInputs, 7.217)).toEqual(tiny);
      await page.getByRole('button', { name: 'Labelled 2D view', exact: true }).click();
      await expect(page.locator('[data-bridge-energy-flow="fallback"]')).toBeVisible();
      await expect(frame).toHaveAttribute('data-flow-trial', 'current');
      const fallback = await checkNativeEnergyFlow(frame, oracle, tinyInputs, 7.217);
      expect(fallback.rates).toEqual(tiny.rates);
      expect(fallback.arrows).toEqual(tiny.arrows);
      expect(fallback.description).toContain('Current experiment');
      await captureNativeEnergyFlow(page, frame, 'energy-transfer-' + width + '-fallback.png');
      await writeFile(join(process.env.BRIDGE_CAPTURE_REPORT || ENHANCEMENT_REPORT, 'energy-transfer-' + width + '-state.json'),
        JSON.stringify({ width, timeS: 7.217, inputs: { guide: pair, saved: saved.inputs, current: tinyInputs },
          guideA: a, guideB: b, savedA, tinyB: tiny, fallback, savedTrial: saved }, null, 2));
      expect(await page.evaluate(() => (window as any).__gl().sceneBuilds)).toBe(before.sceneBuilds);
      expect(await page.evaluate(() => (window as any).__bucket().seismicObservation)).toBe('Trace the energy.');
      expect(await page.evaluate(() => (window as any).__bucket().seismicTrials[0])).toEqual(saved);
      await checkWorkflowHealth(page);
    });
  }

  for (const width of [1000, 320]) {
    test('frame energy: stored components, cumulative dissipation and paired scale at ' + width + 'px', async ({ page }) => {
      // Trace evidence: uncached oracle work alone took 55–87 s per initial check.
      // This budget covers the complete state and capture scenario on slow hosts.
      test.setTimeout(600_000);
      const oracle = await loadFrameEnergyOracle();
      await mountWorkflow(page, width, { bridgeView: 'immersive', bridgeObserver: 'bank', seismicEnabled: true,
        seismicGuideOpen: true, seismicTime: 7.217, crossSectionMm2: 30000, lateralBraceEvery: 1,
        seismicPrediction: 'Stored energy can leave through damping.', seismicObservation: 'Compare amounts and rates.' });
      await page.getByRole('button', { name: 'From the riverbank', exact: true }).click();
      const stage = page.locator('[data-allo-fs-stage]');
      const frame = page.locator('[data-bridge-scene-energy-frame]');
      await expect(frame).toHaveCount(0);
      await page.locator('[data-bridge-scene-energy] > summary').press('Enter');
      await expect(frame).toHaveAttribute('data-energy-trial', 'current');
      await expect(frame.locator('[data-scene-energy-caption]')).toContainText('Current experiment');
      await checkSceneEnergyAmounts(frame, oracle, await flowCurrentInputs(page), 7.217);
      await page.getByRole('button', { name: 'Prepare 5% / 20% comparison', exact: true }).click();
      await page.evaluate(() => (window as any).__set({ seismicTime: 7.217 }));
      const pair = await guidePairInputs(page);
      const b = await checkSceneEnergyAmounts(frame, oracle, pair[1], 7.217, pair);
      await expect(frame.locator('[data-scene-energy-caption]')).toContainText('B · current');
      await page.getByRole('button', { name: 'A · reference', exact: true }).click();
      await expect(frame).toHaveAttribute('data-energy-trial', 'reference');
      await expect(frame.locator('[data-scene-energy-caption]')).toContainText('A · reference');
      const a = await checkSceneEnergyAmounts(frame, oracle, pair[0], 7.217, pair);
      expect(a.limit).toBe(b.limit);
      expect(a.values).not.toEqual(b.values);
      await page.getByRole('button', { name: 'B · current', exact: true }).click();
      expect(await checkSceneEnergyAmounts(frame, oracle, pair[1], 7.217, pair)).toEqual(b);
      await captureSceneEnergyAmounts(page, frame, 'frame-energy-' + width + '-native.png');
      await stage.scrollIntoViewIfNeeded();
      const before = await page.evaluate(() => (window as any).__gl());
      await page.evaluate(() => (window as any).__set({ bridgeBankYaw: 24, bridgeBankPitch: -7 }));
      expect(await checkSceneEnergyAmounts(frame, oracle, pair[1], 7.217, pair)).toEqual(b);
      await page.getByRole('button', { name: 'On the bridge', exact: true }).click();
      expect(await checkSceneEnergyAmounts(frame, oracle, pair[1], 7.217, pair)).toEqual(b);
      await page.getByRole('button', { name: '3D structure', exact: true }).click();
      expect(await checkSceneEnergyAmounts(frame, oracle, pair[1], 7.217, pair)).toEqual(b);
      await page.getByRole('button', { name: 'Save earthquake trial', exact: true }).click();
      const saved = await page.evaluate(() => (window as any).__bucket().seismicTrials[0]);
      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 0.000001, seismicDampingRatio: 0.2,
        seismicTime: 7.217, seismicSceneCompare: true, seismicSceneSource: 'saved', seismicSceneTrial: 'current' }));
      const tinyInputs = await flowCurrentInputs(page);
      const savedPair = [saved.inputs, tinyInputs];
      const tiny = await checkSceneEnergyAmounts(frame, oracle, tinyInputs, 7.217, savedPair);
      expect(tiny.limit).toBeGreaterThan(0.001 * 1.04);
      for (const id of ['kinetic', 'elastic', 'dissipated']) {
        expect(tiny.values[id]).toBeGreaterThan(0);
        expect(tiny.values[id]).toBeLessThan(0.001);
        expect(tiny.widths[id]).toBeGreaterThan(0);
        expect(tiny.widths[id]).toBeLessThan(0.001);
        expect(Math.abs(tiny.values[id] / b.values[id] - Math.pow(0.000001 / 0.12, 2))).toBeLessThan(1e-18);
      }
      await expect(frame.locator('[data-scene-energy-total="stored"]')).toContainText(/e-\d+ J\/kg/);
      await expect(frame.locator('[data-scene-energy-scientific-help]')).toBeVisible();
      await captureSceneEnergyAmounts(page, frame, 'frame-energy-' + width + '-tiny.png');
      await page.getByRole('button', { name: 'A · reference', exact: true }).click();
      const savedA = await checkSceneEnergyAmounts(frame, oracle, saved.inputs, 7.217, savedPair);
      expect(savedA.values).toEqual(b.values);
      expect(savedA.limit).toBe(tiny.limit);
      await page.getByRole('button', { name: 'B · current', exact: true }).click();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await expect(page.getByRole('button', { name: 'Replay scene', exact: true })).toBeDisabled();
      await page.evaluate(() => (window as any).__set({ seismicTime: 16 }));
      const endShaking = await checkSceneEnergyAmounts(frame, oracle, tinyInputs, 16, savedPair);
      await page.evaluate(() => (window as any).__set({ seismicTime: 24 }));
      const decay = await checkSceneEnergyAmounts(frame, oracle, tinyInputs, 24, savedPair);
      expect(decay.limit).toBe(endShaking.limit);
      expect(decay.totals.stored).toBeLessThan(endShaking.totals.stored);
      expect(decay.totals.dissipated).toBeGreaterThan(endShaking.totals.dissipated);
      await captureSceneEnergyAmounts(page, frame, 'frame-energy-' + width + '-decay.png');
      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 0.12, seismicDampingRatio: 0,
        seismicSceneCompare: false, seismicSceneTrial: 'current', seismicTime: 18 }));
      const undamped = await checkSceneEnergyAmounts(frame, oracle, await flowCurrentInputs(page), 18);
      expect(undamped.totals.stored).toBeGreaterThan(0);
      expect(undamped.totals.dissipated).toBe(0);
      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 0, seismicTime: 7.217 }));
      const zero = await checkSceneEnergyAmounts(frame, oracle, await flowCurrentInputs(page), 7.217);
      expect(Object.values(zero.values)).toEqual([0, 0, 0]);
      expect(zero.limit).toBe(0.001 * 1.04);
      await expect(frame.locator('[data-scene-energy-scientific-help]')).toHaveCount(0);
      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 0.000001, seismicDampingRatio: 0.2 }));
      const tinyAlone = await checkSceneEnergyAmounts(frame, oracle, tinyInputs, 7.217);
      expect(tinyAlone.limit).toBe(0.001 * 1.04);
      expect(tinyAlone.values).toEqual(tiny.values);
      await page.evaluate(() => (window as any).__set({ seismicTime: 0 }));
      const rest = await checkSceneEnergyAmounts(frame, oracle, tinyInputs, 0);
      expect(Object.values(rest.values)).toEqual([0, 0, 0]);
      await page.locator('[data-bridge-scene-energy] > summary').press('Enter');
      await expect(frame).toHaveCount(0);
      await page.locator('[data-bridge-scene-energy] > summary').press('Enter');
      expect(await checkSceneEnergyAmounts(frame, oracle, tinyInputs, 0)).toEqual(rest);
      await writeFile(join(process.env.BRIDGE_CAPTURE_REPORT || ENHANCEMENT_REPORT, 'frame-energy-' + width + '-state.json'),
        JSON.stringify({ width, timeS: 7.217, inputs: { guide: pair, saved: saved.inputs, current: tinyInputs },
          guideA: a, guideB: b, savedA, tinyB: tiny, endShaking, decay, undamped, zero, tinyAlone, rest, savedTrial: saved }, null, 2));
      expect(await page.evaluate(() => (window as any).__gl().sceneBuilds)).toBe(before.sceneBuilds);
      expect(await page.evaluate(() => (window as any).__bucket())).toMatchObject({ seismicPlaying: false,
        seismicPrediction: 'Stored energy can leave through damping.', seismicObservation: 'Compare amounts and rates.' });
      expect(await page.evaluate(() => (window as any).__bucket().seismicTrials[0])).toEqual(saved);
      await checkWorkflowHealth(page);
    });
  }

  test('frame energy: graphics loss exposes current amounts and deliberate recovery resumes saved A', async ({ page }) => {
    const oracle = await loadFrameEnergyOracle();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await mountWorkflow(page, 1000, { bridgeView: 'immersive', bridgeObserver: 'bank', bridgeBankYaw: 18,
      seismicEnabled: true, seismicTime: 7.217, seismicSceneEnergy: true,
      seismicPrediction: 'Damping changes stored energy.', seismicObservation: 'Keep the amount evidence.' });
    await page.getByRole('button', { name: 'From the riverbank', exact: true }).click();
    await page.getByRole('button', { name: 'Save earthquake trial', exact: true }).click();
    const saved = await page.evaluate(() => (window as any).__bucket().seismicTrials[0]);
    await page.evaluate(() => (window as any).__set({ seismicIntensityG: 0.000001, seismicDampingRatio: 0.2,
      seismicSceneCompare: true, seismicSceneSource: 'saved', seismicSceneTrial: 'reference' }));
    const current = await flowCurrentInputs(page), pair = [saved.inputs, current];
    const frame = page.locator('[data-bridge-scene-energy-frame]');
    await expect(frame).toHaveAttribute('data-energy-trial', 'reference');
    const reference = await checkSceneEnergyAmounts(frame, oracle, saved.inputs, 7.217, pair);
    await page.locator('[data-allo-fs-stage]').scrollIntoViewIfNeeded();
    await page.evaluate(() => {
      const canvas = document.querySelector('canvas[data-bridge-gl]') as HTMLCanvasElement;
      const context = canvas.getContext('webgl2') || canvas.getContext('webgl');
      const extension = context?.getExtension('WEBGL_lose_context');
      if (!extension) throw new Error('WebGL loss extension unavailable');
      (window as any).__frameEnergyLoss = extension; extension.loseContext();
    });
    await expect(page.locator('[data-bridge-elevation]')).toBeVisible();
    await expect(frame).toHaveCount(0);
    await expect(page.locator('[data-bridge-scene-energy]')).toHaveCount(0);
    const fallback = await checkCurrentEnergyAmountMap(page, oracle, current, 7.217);
    expect(fallback.stored).not.toBe(reference.totals.stored);
    await page.getByRole('button', { name: 'Step forward 0.5 s', exact: true }).click();
    const stepped = await checkCurrentEnergyAmountMap(page, oracle, current, 7.717);
    await captureImmersiveRegion(page, page.locator('[data-seismic-energy-map]'), 'frame-energy-1000-graphics-fallback.png');
    await page.evaluate(() => (window as any).__frameEnergyLoss.restoreContext());
    await expect.poll(() => page.evaluate(() => (window as any).__gl().state)).toBe('ready');
    expect(await page.evaluate(() => (window as any).__bucket().bridgeView)).toBe('2d');
    await expect(frame).toHaveCount(0);
    expect(await checkCurrentEnergyAmountMap(page, oracle, current, 7.717)).toEqual(stepped);
    await page.getByRole('button', { name: 'From the riverbank', exact: true }).click();
    await page.locator('[data-allo-fs-stage]').scrollIntoViewIfNeeded();
    await expect(frame).toHaveAttribute('data-energy-trial', 'reference');
    const recovered = await checkSceneEnergyAmounts(frame, oracle, saved.inputs, 7.717, pair);
    await expect(page.getByRole('button', { name: 'Replay scene', exact: true })).toBeDisabled();
    expect(await page.evaluate(() => (window as any).__bucket())).toMatchObject({ seismicPlaying: false,
      seismicSceneTrial: 'reference', seismicSceneSource: 'saved', seismicTime: 7.717, bridgeBankYaw: 18,
      seismicPrediction: 'Damping changes stored energy.', seismicObservation: 'Keep the amount evidence.' });
    expect(await page.evaluate(() => (window as any).__bucket().seismicTrials[0])).toEqual(saved);
    await writeFile(join(process.env.BRIDGE_CAPTURE_REPORT || ENHANCEMENT_REPORT, 'frame-energy-1000-graphics-state.json'),
      JSON.stringify({ inputs: { reference: saved.inputs, current }, reference, fallback, stepped, recovered, savedTrial: saved }, null, 2));
    await checkWorkflowHealth(page);
  });

  test('energy transfer: graphics loss retains the current power diagram and deliberate recovery', async ({ page }) => {
    const oracle = await loadGuideEnergyOracle();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await mountWorkflow(page, 1000, { bridgeView: 'immersive', bridgeObserver: 'bank', bridgeBankYaw: 18,
      seismicEnabled: true, seismicTime: 7.217, seismicEnergyFlow: true, seismicObservation: 'Keep the evidence.' });
    await page.getByRole('button', { name: 'From the riverbank', exact: true }).click();
    await page.getByRole('button', { name: 'Save earthquake trial', exact: true }).click();
    const saved = await page.evaluate(() => (window as any).__bucket().seismicTrials[0]);
    await page.evaluate(() => (window as any).__set({ seismicDampingRatio: 0.2, seismicSceneCompare: true,
      seismicSceneSource: 'saved', seismicSceneTrial: 'reference' }));
    const frame = page.locator('[data-flow-frame]');
    await expect(frame).toHaveAttribute('data-flow-trial', 'reference');
    const reference = await checkNativeEnergyFlow(frame, oracle, saved.inputs, 7.217);
    const currentInputs = await flowCurrentInputs(page);
    await page.locator('[data-allo-fs-stage]').scrollIntoViewIfNeeded();
    await page.evaluate(() => {
      const canvas = document.querySelector('canvas[data-bridge-gl]') as HTMLCanvasElement;
      const context = canvas.getContext('webgl2') || canvas.getContext('webgl');
      const extension = context?.getExtension('WEBGL_lose_context');
      if (!extension) throw new Error('WebGL loss extension unavailable');
      (window as any).__flowLoss = extension; extension.loseContext();
    });
    await expect(page.locator('[data-bridge-energy-flow="fallback"]')).toBeVisible();
    await expect(frame).toHaveAttribute('data-flow-trial', 'current');
    const fallback = await checkNativeEnergyFlow(frame, oracle, currentInputs, 7.217);
    expect(fallback.rates).not.toEqual(reference.rates);
    expect(fallback.description).toContain('Current experiment');
    await page.getByRole('button', { name: 'Step forward 0.5 s', exact: true }).click();
    const stepped = await checkNativeEnergyFlow(frame, oracle, currentInputs, 7.717);
    await captureNativeEnergyFlow(page, frame, 'energy-transfer-1000-graphics-fallback.png');
    await writeFile(join(process.env.BRIDGE_CAPTURE_REPORT || ENHANCEMENT_REPORT, 'energy-transfer-1000-graphics-state.json'),
      JSON.stringify({ inputs: { reference: saved.inputs, current: currentInputs }, reference, fallback, stepped, savedTrial: saved }, null, 2));
    await page.evaluate(() => (window as any).__flowLoss.restoreContext());
    await expect.poll(() => page.evaluate(() => (window as any).__gl().state)).toBe('ready');
    expect(await page.evaluate(() => (window as any).__bucket().bridgeView)).toBe('2d');
    expect(await checkNativeEnergyFlow(frame, oracle, currentInputs, 7.717)).toEqual(stepped);
    await page.getByRole('button', { name: 'From the riverbank', exact: true }).click();
    await page.locator('[data-allo-fs-stage]').scrollIntoViewIfNeeded();
    await expect(page.locator('[data-bridge-energy-flow="scene"]')).toBeVisible();
    await expect(frame).toHaveAttribute('data-flow-trial', 'reference');
    await checkNativeEnergyFlow(frame, oracle, saved.inputs, 7.717);
    expect(await page.evaluate(() => (window as any).__bucket())).toMatchObject({ seismicPlaying: false,
      seismicSceneTrial: 'reference', seismicSceneSource: 'saved', bridgeBankYaw: 18, seismicObservation: 'Keep the evidence.' });
    expect(await page.evaluate(() => (window as any).__bucket().seismicTrials[0])).toEqual(saved);
    await checkWorkflowHealth(page);
  });

  test('motion guide: WebGL loss retains current measurements and recovery restores resting rails', async ({ page }) => {
    await mountWorkflow(page, 1000, { bridgeView: 'immersive', seismicEnabled: true, seismicTime: 7.2, seismicMotionGuide: true });
    await page.getByRole('button', { name: 'On the bridge', exact: true }).click();
    const position = await checkMotionPositionDiagram(page.locator('[data-motion-frame]'));
    const values = await page.locator('[data-motion-reading]').allTextContents();
    await page.evaluate(() => {
      const canvas = document.querySelector('canvas[data-bridge-gl]') as HTMLCanvasElement;
      const context = canvas.getContext('webgl2') || canvas.getContext('webgl');
      const extension = context?.getExtension('WEBGL_lose_context');
      if (!extension) throw new Error('WebGL loss extension unavailable');
      (window as any).__motionLoss = extension;
      extension.loseContext();
    });
    await expect(page.locator('[data-bridge-motion-guide="fallback"]')).toBeVisible();
    expect(await page.locator('[data-motion-reading]').allTextContents()).toEqual(values);
    expect(await checkMotionPositionDiagram(page.locator('[data-motion-frame]'))).toEqual(position);
    await page.evaluate(() => (window as any).__motionLoss.restoreContext());
    await page.getByRole('button', { name: 'On the bridge', exact: true }).click();
    await page.locator('[data-allo-fs-stage]').scrollIntoViewIfNeeded();
    await expect.poll(() => page.evaluate(() => (window as any).__gl().state)).toBe('ready');
    await expect.poll(() => page.evaluate(() => (window as any).__gl().motionReferenceVisible)).toBe(true);
    await expect(page.locator('[data-bridge-motion-guide="scene"]')).toBeVisible();
    expect(await page.locator('[data-motion-reading]').allTextContents()).toEqual(values);
    expect(await checkMotionPositionDiagram(page.locator('[data-motion-frame]'))).toEqual(position);
    await checkWorkflowHealth(page);
  });

  for (const width of [1000, 320]) {
    test('riverbank observer: same moment, independent poses and fullscreen A/B at ' + width + 'px', async ({ page }) => {
      await mountWorkflow(page, width, { bridgeView: 'immersive', bridgeWalkPos: 0.62, bridgeLookYaw: 20,
        bridgeLookPitch: -6, seismicEnabled: true, seismicTime: 7.2, seismicMotionGuide: true, seismicGuideOpen: true,
        crossSectionMm2: 30000, lateralBraceEvery: 1, seismicObservation: 'Keep my observation.' });
      const stage = page.locator('[data-allo-fs-stage]');
      const viewer = page.locator('[aria-describedby="bridge-gl-description"]');
      await page.getByRole('button', { name: 'From the riverbank', exact: true }).click();
      await stage.scrollIntoViewIfNeeded();
      await expect.poll(() => page.evaluate(() => (window as any).__gl().cameraMode)).toBe('bank');
      await expect(page.locator('[data-bridge-observer-hint]')).toContainText('moves with the ground');
      await expect(viewer).toHaveAttribute('aria-label', /Standing at an observation point on the riverbank/);
      await expect(page.getByRole('slider', { name: 'Position on bridge (%)', exact: true })).toHaveCount(0);
      const before = await page.evaluate(() => (window as any).__gl());
      await page.evaluate(() => (window as any).__set({ seismicTime: 8 }));
      await expect.poll(() => page.evaluate(() => (window as any).__gl().groundOffsetM)).not.toBe(before.groundOffsetM);
      const moved = await page.evaluate(() => (window as any).__gl());
      expect(moved.cameraPosition.z - before.cameraPosition.z).toBeCloseTo((moved.groundOffsetM - before.groundOffsetM) * 10, 8);
      moved.cameraDirection.forEach((value: number, axis: number) => expect(value).toBeCloseTo(before.cameraDirection[axis], 8));
      await viewer.press('ArrowRight');
      await viewer.press('ArrowUp');
      expect(await page.evaluate(() => (window as any).__bucket().bridgeBankYaw)).toBe(8);
      expect(await page.evaluate(() => (window as any).__bucket().bridgeBankPitch)).toBe(5);
      expect(await page.evaluate(() => (window as any).__bucket().bridgeWalkPos)).toBe(0.62);
      await page.getByRole('button', { name: 'Switch to deck viewpoint', exact: true }).click();
      await expect(viewer).toBeFocused();
      await expect.poll(() => page.evaluate(() => (window as any).__gl().cameraMode)).toBe('deck');
      expect(await page.evaluate(() => (window as any).__bucket().bridgeLookYaw)).toBe(20);
      await page.getByRole('button', { name: 'Switch to riverbank viewpoint', exact: true }).click();
      expect(await page.evaluate(() => (window as any).__bucket().bridgeBankYaw)).toBe(8);
      expect(await page.evaluate(() => (window as any).__bucket().bridgeBankPitch)).toBe(5);
      const viewerBox = await viewer.boundingBox();
      if (!viewerBox) throw new Error('Bank viewer is not visible');
      await page.mouse.move(viewerBox.x + viewerBox.width * 0.9, viewerBox.y + viewerBox.height * 0.5);
      await page.mouse.down();
      await page.mouse.move(viewerBox.x + viewerBox.width * 0.9 - 12, viewerBox.y + viewerBox.height * 0.5 + 12, { steps: 3 });
      await page.mouse.up();
      expect(await page.evaluate(() => (window as any).__bucket().bridgeBankYaw)).not.toBe(8);
      expect(await page.evaluate(() => (window as any).__bucket().bridgeLookYaw)).toBe(20);
      await viewer.press('Home');
      await page.getByRole('button', { name: 'Prepare 5% / 20% comparison', exact: true }).click();
      await page.evaluate(() => (window as any).__set({ seismicTime: 8 }));
      await page.getByRole('button', { name: 'View the 3D bridge fullscreen', exact: true }).click();
      await checkBridgeCanvasFillsStage(page);
      await expect.poll(() => page.evaluate(() => (window as any).__gl().observerAnchor)).toBe('ground');
      const bankB = await page.evaluate(() => (window as any).__gl());
      await page.getByRole('button', { name: 'A · reference', exact: true }).click();
      await expect.poll(() => page.evaluate(() => (window as any).__gl().deckOffsetM)).not.toBe(bankB.deckOffsetM);
      const bankA = await page.evaluate(() => (window as any).__gl());
      expect(bankA.cameraPosition).toEqual(bankB.cameraPosition);
      expect(bankA.cameraDirection).toEqual(bankB.cameraDirection);
      const readings = await page.locator('[data-motion-reading]').allTextContents();
      await stage.screenshot({ path: join(ENHANCEMENT_REPORT, 'bridge-' + width + '-bank-a.png') });
      const measurementToggle = page.locator('[data-bridge-scene-readout] > summary');
      await measurementToggle.press('Enter');
      await expect(page.locator('[data-motion-frame]')).toHaveCount(0);
      await expect(page.locator('[data-bridge-scene-readout]')).toContainText('A · reference · 8.00 s');
      await expect.poll(() => page.evaluate(() => (window as any).__gl().motionReferenceVisible)).toBe(true);
      await stage.screenshot({ path: join(ENHANCEMENT_REPORT, 'bridge-' + width + '-bank-immersive.png') });
      await page.getByRole('button', { name: 'Switch to deck viewpoint', exact: true }).click();
      await expect.poll(() => page.evaluate(() => (window as any).__gl().observerAnchor)).toBe('deck');
      await expect(page.locator('[data-motion-frame]')).toHaveCount(0);
      await measurementToggle.press('Enter');
      await expect(page.locator('[data-motion-reading]')).toHaveText(readings);
      expect(await page.evaluate(() => (window as any).__bucket().seismicTime)).toBe(8);
      await stage.screenshot({ path: join(ENHANCEMENT_REPORT, 'bridge-' + width + '-deck-a.png') });
      await page.getByRole('button', { name: 'Switch to riverbank viewpoint', exact: true }).click();
      await expect.poll(() => page.evaluate(() => (window as any).__gl().cameraPosition)).toEqual(bankA.cameraPosition);
      await page.getByRole('button', { name: 'Replay scene', exact: true }).click();
      await expect.poll(() => page.evaluate(() => (window as any).__bucket().seismicTime)).toBeGreaterThan(8);
      await page.getByRole('button', { name: 'Switch to deck viewpoint', exact: true }).click();
      expect(await page.evaluate(() => (window as any).__bucket().seismicPlaying)).toBe(false);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.getByRole('button', { name: 'Switch to riverbank viewpoint', exact: true }).click();
      await page.getByRole('slider', { name: 'Scene replay time (s)', exact: true }).press('End');
      await expect.poll(() => page.evaluate(() => (window as any).__gl().groundOffsetM)).toBe(0);
      await expect(page.getByRole('button', { name: 'Replay scene', exact: true })).toBeDisabled();
      await expect.poll(() => page.evaluate(() => (window as any).__gl().sceneBuilds)).toBe(before.sceneBuilds);
      // A first visit can upload previously culled meshes. After both fixed
      // views have rendered, repeated switching must not grow GPU resources.
      let warmedResources;
      for (let cycle = 0; cycle < 3; cycle++) {
        await page.getByRole('button', { name: 'Switch to deck viewpoint', exact: true }).click();
        await expect.poll(() => page.evaluate(() => (window as any).__gl().cameraMode)).toBe('deck');
        await page.getByRole('button', { name: 'Switch to riverbank viewpoint', exact: true }).click();
        await expect.poll(() => page.evaluate(() => (window as any).__gl().cameraMode)).toBe('bank');
        const resources = await page.evaluate(() => (window as any).__gl().resources);
        if (cycle === 0) warmedResources = resources;
        else expect(resources).toEqual(warmedResources);
      }
      await page.getByRole('button', { name: 'Exit fullscreen 3D bridge (Escape)', exact: true }).click();
      await page.getByRole('button', { name: 'Labelled 2D view', exact: true }).click();
      await expect(page.locator('[data-bridge-observer-switch]')).toHaveCount(0);
      await page.getByRole('button', { name: 'From the riverbank', exact: true }).click();
      await stage.scrollIntoViewIfNeeded();
      await expect.poll(() => page.evaluate(() => (window as any).__gl().cameraMode)).toBe('bank');
      expect(await page.evaluate(() => (window as any).__bucket().seismicObservation)).toBe('Keep my observation.');
      await checkWorkflowHealth(page);
    });
  }

  test('riverbank observer: WebGL recovery preserves the selected observer without resuming motion', async ({ page }) => {
    await mountWorkflow(page, 1000, { bridgeView: 'immersive', bridgeObserver: 'bank', bridgeBankYaw: 12,
      bridgeBankPitch: -5, seismicEnabled: true, seismicTime: 8, seismicMotionGuide: true });
    await page.evaluate(() => {
      const canvas = document.querySelector('canvas[data-bridge-gl]') as HTMLCanvasElement;
      const context = canvas.getContext('webgl2') || canvas.getContext('webgl');
      const extension = context?.getExtension('WEBGL_lose_context');
      if (!extension) throw new Error('WebGL loss extension unavailable');
      (window as any).__bankLoss = extension;
      extension.loseContext();
    });
    await expect(page.locator('[data-bridge-motion-guide="fallback"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'From the riverbank', exact: true })).toBeDisabled();
    await page.evaluate(() => (window as any).__bankLoss.restoreContext());
    await expect.poll(() => page.evaluate(() => (window as any).__gl().state)).toBe('ready');
    expect(await page.evaluate(() => (window as any).__bucket().bridgeView)).toBe('2d');
    await page.getByRole('button', { name: 'From the riverbank', exact: true }).click();
    await page.locator('[data-allo-fs-stage]').scrollIntoViewIfNeeded();
    await expect.poll(() => page.evaluate(() => (window as any).__gl().observerAnchor)).toBe('ground');
    expect(await page.evaluate(() => (window as any).__bucket())).toMatchObject({ bridgeBankYaw: 12, bridgeBankPitch: -5, seismicTime: 8, seismicPlaying: false });
    await checkWorkflowHealth(page);
  });

  test.describe('earthquake replay', () => {
    test.use({ hasTouch: true });
    for (const fallback of [false, true]) {
      test('WebGL loss exits ' + (fallback ? 'fill-frame' : 'native fullscreen') + ' and preserves a usable focused fallback', async ({ page }) => {
        await mountWorkflow(page, 1000, { bridgeView: 'immersive', seismicEnabled: true, seismicTime: 7.2 });
        const stage = page.locator('[data-allo-fs-stage]');
        if (fallback) await stage.evaluate(element => {
          Object.defineProperty(element, 'requestFullscreen', { configurable: true, value: () => Promise.reject(new Error('Exercise fill-frame fallback')) });
        });
        await page.getByRole('button', { name: 'View the 3D bridge fullscreen', exact: true }).click();
        await expect(page.getByRole('button', { name: 'Exit fullscreen 3D bridge (Escape)', exact: true })).toBeVisible();
        await expect.poll(() => stage.evaluate(element => (element as any).__alloFsOn === true || document.fullscreenElement === element)).toBe(true);
        await checkBridgeCanvasFillsStage(page);
        await page.getByRole('button', { name: 'Replay scene', exact: true }).click();
        await page.getByRole('button', { name: 'Pause scene replay', exact: true }).focus();
        await page.evaluate(() => {
          const canvas = document.querySelector('canvas[data-bridge-gl]') as HTMLCanvasElement;
          const context = canvas.getContext('webgl2') || canvas.getContext('webgl');
          const extension = context?.getExtension('WEBGL_lose_context');
          if (!extension) throw new Error('WebGL loss extension unavailable');
          extension.loseContext();
        });
        await expect(page.locator('[data-bridge-elevation]')).toBeFocused();
        await expect(page.locator('[data-bridge-elevation]')).toBeVisible();
        await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(false);
        expect(await stage.evaluate(element => !!(element as any).__alloFsOn)).toBe(false);
        expect(await page.evaluate(() => (window as any).__bucket().seismicPlaying)).toBe(false);
        const chart = page.getByRole('slider', { name: 'Inspect earthquake timeline (s)', exact: true });
        await chart.press('End');
        await expect(chart).toHaveAttribute('aria-valuenow', '24');
        if (fallback) expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
        await checkWorkflowHealth(page);
      });
    }
    for (const width of [1000, 320]) {
      test('scene controls, fullscreen and synchronized timeline at ' + width + 'px', async ({ page }) => {
        await mkdir(REPLAY_REPORT, { recursive: true });
        await mountWorkflow(page, width, { bridgeView: 'immersive', seismicEnabled: true, seismicTime: 7.2 });
        const stage = page.locator('[data-allo-fs-stage]');
        const scene = page.getByRole('group', { name: 'Earthquake scene replay', exact: true });
        await expect(scene).toBeVisible();
        await page.getByLabel('Scene replay speed', { exact: true }).selectOption('0.25');
        await expect(page.getByLabel('Replay speed', { exact: true })).toHaveValue('0.25');
        await stage.scrollIntoViewIfNeeded();
        const before = await page.evaluate(() => (window as any).__gl());
        await captureImmersiveRegion(page, stage, 'bridge-' + width + '-scene-replay.png', REPLAY_REPORT);
        await page.getByRole('button', { name: 'View the 3D bridge fullscreen', exact: true }).click();
        await expect(page.getByRole('button', { name: 'Exit fullscreen 3D bridge (Escape)', exact: true })).toBeVisible();
        await expect(scene).toBeVisible();
        await checkBridgeCanvasFillsStage(page);
        await page.getByRole('button', { name: 'Replay scene', exact: true }).click();
        await expect.poll(() => page.evaluate(() => (window as any).__bucket().seismicTime)).toBeGreaterThan(7.2);
        await page.getByRole('button', { name: 'Pause scene replay', exact: true }).click();
        const sceneTime = page.getByRole('slider', { name: 'Scene replay time (s)', exact: true });
        await sceneTime.press('Home');
        await sceneTime.press('ArrowRight');
        await expect.poll(() => page.evaluate(() => (window as any).__bucket().seismicTime)).toBe(0.05);
        expect(await page.evaluate(() => (window as any).__bucket().seismicPlaying)).toBe(false);
        await page.getByRole('button', { name: 'Exit fullscreen 3D bridge (Escape)', exact: true }).click();

        const timeline = page.locator('[data-bridge-seismic-timeline]');
        const chart = page.getByRole('slider', { name: 'Inspect earthquake timeline (s)', exact: true });
        await chart.scrollIntoViewIfNeeded();
        const box = await chart.boundingBox();
        if (!box) throw new Error('Timeline chart is not visible');
        if (width === 320) await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
        else {
          await page.mouse.move(box.x + box.width / 4, box.y + box.height / 2);
          await page.mouse.down();
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 4 });
          await page.mouse.up();
        }
        await expect(chart).toHaveAttribute('aria-valuenow', '12');
        await expect(chart).toBeFocused();
        await chart.press('PageUp');
        await expect(chart).toHaveAttribute('aria-valuenow', '13');
        await expect(page.getByRole('slider', { name: 'Experiment time (s)', exact: true })).toHaveValue('13');
        await expect(sceneTime).toHaveValue('13');
        await expect(page.locator('[data-seismic-time-cursor]')).toHaveAttribute('data-seismic-time-cursor', '13');
        await expect(page.locator('[data-bridge-seismic-readout]')).toContainText('13.000 s');
        await expect(timeline.locator('[data-seismic-energy-area]')).toHaveCount(3);
        await captureImmersiveRegion(page, timeline, 'bridge-' + width + '-energy-timeline.png', REPLAY_REPORT);
        await page.getByRole('button', { name: 'Motion over time', exact: true }).click();
        await expect(chart).toHaveAttribute('aria-valuenow', '13');
        await expect(timeline.locator('polyline[stroke-dasharray]')).toHaveCount(1);
        await captureImmersiveRegion(page, timeline, 'bridge-' + width + '-motion-timeline.png', REPLAY_REPORT);
        await stage.scrollIntoViewIfNeeded();
        await expect.poll(() => page.evaluate(() => (window as any).__gl().sceneBuilds)).toBe(before.sceneBuilds);
        await expect.poll(() => page.evaluate(() => (window as any).__gl().relativeOffsetM)).not.toBe(before.relativeOffsetM);
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await expect(page.getByRole('button', { name: 'Replay scene', exact: true })).toBeDisabled();
        await chart.press('End');
        await expect(chart).toHaveAttribute('aria-valuetext', '24.000 s · Observation ends');
        expect(await page.evaluate(() => (window as any).__bucket().seismicPlaying)).toBe(false);
        await checkWorkflowHealth(page);
      });
    }
  });

  for (const width of [1000, 320]) {
    test('decay fraction: inspect, record and print each trial\'s fraction remaining at ' + width + 'px', async ({ page }) => {
      const oracle = await loadGuideEnergyOracle();
      await mkdir(DECAY_FRACTION_REPORT, { recursive: true });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await mountWorkflow(page, width, {
        bridgeView: '3d', seismicEnabled: true, seismicGuideOpen: true,
        seismicEnergyInterval: true, seismicIntervalPinS: 7.217,
        seismicPrediction: 'Keep fraction prediction', seismicObservation: 'Keep fraction explanation',
        seismicSceneNote: 'Keep separate scene note', seismicGuidePrediction: 'Keep damping prediction',
        seismicGuideClaim: 'Keep damping claim', seismicGuideReasoning: 'Keep damping reasoning'
      });
      const guide = page.locator('[data-bridge-damping-guide="interactive"]');
      const current = guide.locator('[data-guide-readings="current"]');
      const prepare = guide.getByRole('button', { name: 'Prepare 5% / 20% comparison', exact: true });
      await prepare.click();
      await expect(current.locator('[data-guide-decay-disclosure]')).toHaveCount(0);

      const inspect16 = guide.getByRole('button', { name: 'Inspect both at 16 s', exact: true });
      await inspect16.focus();
      await inspect16.press('Enter');
      await expect(inspect16).toBeFocused();
      const disclosure = current.locator('[data-guide-decay-disclosure]');
      const summary = disclosure.locator(':scope > summary');
      await expect(disclosure).not.toHaveAttribute('open', '');
      await expect(current.locator('[data-guide-decay-fractions]')).toBeHidden();
      await openGuideDecayFractions(current);
      let inputs = await guidePairInputs(page);
      let fractions = await checkGuideDecayFractions(current, oracle, inputs, 16);
      for (const reading of await fractions.locator('[data-guide-decay-value]').all()) {
        await expect(reading).toHaveAttribute('data-guide-decay-fraction', '1');
      }
      // The native disclosure can close and reopen using only the keyboard.
      await summary.press('Space');
      await expect(disclosure).not.toHaveAttribute('open', '');
      await expect(fractions).toBeHidden();
      await summary.press('Enter');
      await expect(summary).toBeFocused();

      await page.evaluate(() => (window as any).__set({ seismicTime: 21.217 }));
      fractions = await checkGuideDecayFractions(current, oracle, inputs, 21.217);
      const ordinary = await guideDecaySnapshot(fractions);
      await captureImmersiveRegion(page, current.locator('[data-guide-energy-budget]'),
        'decay-fraction-' + width + '-fractional.png', DECAY_FRACTION_REPORT);

      const inspect24 = guide.getByRole('button', { name: 'Inspect both at 24 s', exact: true });
      await inspect24.focus();
      await inspect24.press('Space');
      await expect(inspect24).toBeFocused();
      await checkGuideDecayFractions(current, oracle, inputs, 24);
      expect(await page.evaluate(() => (window as any).__bucket())).toMatchObject({
        seismicTime: 24, seismicIntervalPinS: 7.217, seismicPlaying: false, autoDriving: false
      });

      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 0.000001 }));
      await prepare.click();
      await page.evaluate(() => (window as any).__set({ seismicTime: 21.217 }));
      await openGuideDecayFractions(current);
      inputs = await guidePairInputs(page);
      fractions = await checkGuideDecayFractions(current, oracle, inputs, 21.217);
      const tiny = await guideDecaySnapshot(fractions);
      tiny.trials.forEach((trial, index) => {
        expect(Number(trial.initial)).toBeGreaterThan(0);
        expect(Number(trial.initial)).toBeLessThan(0.001);
        expect(Number(trial.fraction)).toBeCloseTo(Number(ordinary.trials[index].fraction), 10);
      });
      await captureImmersiveRegion(page, current.locator('[data-guide-energy-budget]'),
        'decay-fraction-' + width + '-tiny.png', DECAY_FRACTION_REPORT);

      // One zero trial cannot inherit the other trial's denominator or 100% mark.
      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 0 }));
      inputs = await guidePairInputs(page);
      fractions = await checkGuideDecayFractions(current, oracle, inputs, 21.217);
      await expect(fractions.locator('[data-guide-decay-trial="a"] [data-guide-decay-value]')).toHaveCount(1);
      await expect(fractions.locator('[data-guide-decay-trial="b"] [data-guide-decay-undefined]')).toBeVisible();
      await prepare.click();
      await page.evaluate(() => (window as any).__set({ seismicTime: 21.217 }));
      await openGuideDecayFractions(current);
      inputs = await guidePairInputs(page);
      fractions = await checkGuideDecayFractions(current, oracle, inputs, 21.217);
      await expect(fractions.locator('[data-guide-decay-undefined]')).toHaveCount(2);
      await expect(fractions.locator('[data-guide-decay-value],[data-guide-decay-bar],[data-guide-decay-reference]')).toHaveCount(0);
      await captureImmersiveRegion(page, current.locator('[data-guide-energy-budget]'),
        'decay-fraction-' + width + '-zero.png', DECAY_FRACTION_REPORT);

      // Record a confounded tiny pair, then change live inputs and inspection time.
      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 0.000001 }));
      await prepare.click();
      await page.evaluate(() => (window as any).__set({ seismicFrequencyHz: 0.65, seismicTime: 21.217 }));
      inputs = await guidePairInputs(page);
      await guide.getByRole('button', { name: 'Record paired evidence', exact: true }).click();
      const recorded = guide.locator('[data-guide-readings="recorded"]');
      await openGuideDecayFractions(recorded);
      const recordedFractions = await checkGuideDecayFractions(recorded, oracle, inputs, 21.217);
      const recordedSnapshot = await guideDecaySnapshot(recordedFractions);
      const recordedText = await recorded.textContent();
      const recordedEvidence = await page.evaluate(() => JSON.stringify((window as any).__bucket().seismicGuideEvidence));
      await expect(recorded.locator('[data-guide-comparison-context]'))
        .toHaveAttribute('data-guide-comparison-context', 'confounded');
      await captureImmersiveRegion(page, recorded,
        'decay-fraction-' + width + '-recorded.png', DECAY_FRACTION_REPORT);
      await page.evaluate(() => (window as any).__set({
        seismicFrequencyHz: 1.1, seismicIntensityG: 0.12, seismicDampingRatio: 0.35, seismicTime: 24
      }));
      await expect(guide.locator('[data-guide-evidence]')).toHaveAttribute('data-guide-evidence', 'earlier');
      expect(await guideDecaySnapshot(await checkGuideDecayFractions(recorded, oracle, inputs, 21.217)))
        .toEqual(recordedSnapshot);
      expect(await recorded.textContent()).toBe(recordedText);
      expect(await page.evaluate(() => JSON.stringify((window as any).__bucket().seismicGuideEvidence))).toBe(recordedEvidence);

      await guide.getByRole('button', { name: 'Open investigation report', exact: true }).click();
      const printedGuide = page.locator('[data-bridge-damping-guide="print"]');
      const printed = printedGuide.locator('[data-guide-readings="recorded"]');
      const printedFractions = await checkGuideDecayFractions(printed, oracle, inputs, 21.217);
      expect(await guideDecaySnapshot(printedFractions)).toEqual(recordedSnapshot);
      await expect(printedGuide.locator('details,summary,select,button,input,textarea')).toHaveCount(0);
      await expect(printed.locator('[data-guide-comparison-context]'))
        .toHaveAttribute('data-guide-comparison-context', 'confounded');
      await page.emulateMedia({ media: 'print' });
      await captureImmersiveRegion(page, printed,
        'decay-fraction-' + width + '-print.png', DECAY_FRACTION_REPORT);
      await page.emulateMedia({ media: 'screen' });
      expect(await page.evaluate(() => (window as any).__bucket())).toMatchObject({
        seismicTime: 24, seismicIntervalPinS: 7.217,
        seismicPrediction: 'Keep fraction prediction', seismicObservation: 'Keep fraction explanation',
        seismicSceneNote: 'Keep separate scene note', seismicGuidePrediction: 'Keep damping prediction',
        seismicGuideClaim: 'Keep damping claim', seismicGuideReasoning: 'Keep damping reasoning'
      });
      await checkWorkflowHealth(page);
    });
  }

  test('decay fraction: guide B and its denominator survive scene A and graphics fallback', async ({ page }) => {
    const oracle = await loadGuideEnergyOracle();
    await mkdir(DECAY_FRACTION_REPORT, { recursive: true });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await mountWorkflow(page, 844, {
      bridgeView: 'immersive', bridgeObserver: 'bank', seismicEnabled: true,
      seismicGuideOpen: true, seismicEnergyInterval: true, seismicTime: 21.217,
      seismicIntervalPinS: 7.217, seismicDampingRatio: 0.12,
      seismicTrialName: 'Separate fraction notebook reference',
      seismicObservation: 'Keep fraction notebook evidence', seismicSceneNote: 'Keep fraction scene note',
      seismicGuideClaim: 'Keep fraction guide claim'
    });
    // Startup graphics recovery can leave the product in 2D. Explicitly choose
    // the intended viewpoint before testing independent scene and notebook data.
    await page.getByRole('button', { name: 'From the riverbank', exact: true }).click();
    await expect.poll(() => page.evaluate(() => (window as any).__bucket().bridgeView)).toBe('immersive');
    await expect(page.locator('[data-bridge-scene-readout]')).toBeVisible();
    await page.getByRole('button', { name: 'Save earthquake trial', exact: true }).click();
    const savedTrials = await page.evaluate(() => JSON.stringify((window as any).__bucket().seismicTrials));
    const guide = page.locator('[data-bridge-damping-guide="interactive"]');
    await guide.getByRole('button', { name: 'Prepare 5% / 20% comparison', exact: true }).click();
    await page.evaluate(() => (window as any).__set({ seismicTime: 21.217 }));
    const inputs = await guidePairInputs(page);
    const current = guide.locator('[data-guide-readings="current"]');
    await openGuideDecayFractions(current);
    const fractions = await checkGuideDecayFractions(current, oracle, inputs, 21.217);
    const before = await guideDecaySnapshot(fractions);
    expect(Number(before.trials[1].fraction), 'guide B has its own damping response')
      .not.toBe(Number(before.trials[0].fraction));
    const guideInputs = await page.evaluate(() => JSON.stringify((window as any).__bucket().seismicGuideBaseline));

    const claim = page.locator('[data-claim-evidence-disclosure]');
    await claim.locator(':scope > summary').click();
    const quantity = claim.getByRole('combobox', { name: 'Interval evidence quantity', exact: true });
    await quantity.selectOption('elastic');
    await expect(claim.locator('[data-claim-reference]')).toContainText('Separate fraction notebook reference');
    await page.getByRole('button', { name: 'A · reference', exact: true }).click();
    await expect(page.locator('[data-bridge-scene-readout]')).toHaveAttribute('data-scene-trial', 'reference');
    expect(await guideDecaySnapshot(await checkGuideDecayFractions(current, oracle, inputs, 21.217))).toEqual(before);
    await captureImmersiveRegion(page, current,
      'decay-fraction-844-scene-a.png', DECAY_FRACTION_REPORT);

    await page.locator('[data-allo-fs-stage]').scrollIntoViewIfNeeded();
    await page.evaluate(() => {
      const canvas = document.querySelector('canvas[data-bridge-gl]') as HTMLCanvasElement;
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      const loss = gl?.getExtension('WEBGL_lose_context');
      if (!loss) throw Error('No graphics loss extension');
      (window as any).__decayFractionLoss = loss;
      loss.loseContext();
    });
    await expect(page.locator('[data-bridge-elevation]')).toBeVisible();
    await expect(current.locator('[data-guide-decay-disclosure]')).toHaveAttribute('open', '');
    expect(await guideDecaySnapshot(await checkGuideDecayFractions(current, oracle, inputs, 21.217))).toEqual(before);
    await expect(quantity).toHaveValue('elastic');
    await captureImmersiveRegion(page, current,
      'decay-fraction-844-fallback.png', DECAY_FRACTION_REPORT);
    await page.evaluate(() => (window as any).__decayFractionLoss.restoreContext());
    await expect.poll(() => page.evaluate(() => (window as any).__gl().state)).toBe('ready');
    expect(await guideDecaySnapshot(await checkGuideDecayFractions(current, oracle, inputs, 21.217))).toEqual(before);
    expect(await page.evaluate(() => JSON.stringify((window as any).__bucket().seismicTrials))).toBe(savedTrials);
    expect(await page.evaluate(() => JSON.stringify((window as any).__bucket().seismicGuideBaseline))).toBe(guideInputs);
    await expect(quantity).toHaveValue('elastic');
    expect(await page.evaluate(() => (window as any).__bucket())).toMatchObject({
      bridgeView: '2d', seismicSceneSource: 'guide', seismicSceneTrial: 'reference',
      seismicDampingRatio: 0.2, seismicTime: 21.217, seismicIntervalPinS: 7.217,
      seismicObservation: 'Keep fraction notebook evidence', seismicSceneNote: 'Keep fraction scene note',
      seismicGuideClaim: 'Keep fraction guide claim'
    });
    await checkWorkflowHealth(page);
  });

  test('immersive earthquake: playback requires consent and reduced motion keeps deliberate stepping available', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await mountWorkflow(page, 1000, { bridgeView: 'immersive', seismicEnabled: true, seismicPlaying: true, seismicTime: 6 });
    await expect.poll(() => page.evaluate(() => (window as any).__bucket().seismicPlaying)).toBe(false);
    await page.waitForTimeout(150);
    expect(await page.evaluate(() => (window as any).__bucket().seismicTime)).toBe(6);
    const step = page.getByRole('button', { name: 'Step forward 0.5 s', exact: true });
    await step.focus();
    await step.press('Enter');
    await expect.poll(() => page.evaluate(() => (window as any).__bucket().seismicTime)).toBe(6.5);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.getByRole('button', { name: 'Run earthquake', exact: true }).click();
    await expect.poll(() => page.evaluate(() => (window as any).__bucket().seismicTime)).toBeGreaterThan(6.5);
    await page.getByRole('button', { name: 'Pause earthquake', exact: true }).click();
    const paused = await page.evaluate(() => (window as any).__bucket().seismicTime);
    await page.waitForTimeout(150);
    expect(await page.evaluate(() => (window as any).__bucket().seismicTime)).toBe(paused);
    await page.getByRole('button', { name: 'Run earthquake', exact: true }).click();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect.poll(() => page.evaluate(() => (window as any).__bucket().seismicPlaying)).toBe(false);
    await expect(step).toBeEnabled();
    await checkWorkflowHealth(page);
  });
  for (const width of [1000, 320]) {
    test('decay time: exact local inspection preserves paired evidence at ' + width + 'px', async ({ page }) => {
      const oracle = await loadGuideEnergyOracle();
      const report = process.env.BRIDGE_REPORT_DIR || join(ROOT, 'reports', 'bridgelab-starting-energy-2026-10-05');
      await mkdir(report, { recursive: true });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await mountWorkflow(page, width, {
        bridgeView: 'immersive', bridgeObserver: 'bank', seismicEnabled: true,
        seismicGuideOpen: true, seismicEnergyInterval: true, seismicIntervalPinS: 7.217,
        seismicDampingRatio: 0.12, seismicTrialName: 'Keep independent time notebook',
        seismicPrediction: 'Keep time prediction', seismicObservation: 'Keep time observation',
        seismicSceneNote: 'Keep time scene note', seismicGuidePrediction: 'Keep time guide prediction',
        seismicGuideClaim: 'Keep time guide claim', seismicGuideReasoning: 'Keep time guide reasoning'
      });
      await page.getByRole('button', { name: 'Save earthquake trial', exact: true }).click();
      const savedTrials = await page.evaluate(() => JSON.stringify((window as any).__bucket().seismicTrials));
      const guide = page.locator('[data-bridge-damping-guide="interactive"]');
      await guide.getByRole('button', { name: 'Prepare 5% / 20% comparison', exact: true }).click();
      await guide.getByRole('button', { name: 'Inspect both at 16 s', exact: true }).click();
      await page.getByRole('button', { name: 'A · reference', exact: true }).click();
      await expect(page.locator('[data-bridge-scene-readout]')).toHaveAttribute('data-scene-trial', 'reference');
      const pairInputs = await guidePairInputs(page);
      const guideBaseline = await page.evaluate(() => JSON.stringify((window as any).__bucket().seismicGuideBaseline));
      const current = guide.locator('[data-guide-readings="current"]');
      await openGuideDecayFractions(current);
      const controls = current.locator('[data-guide-decay-time-controls]');
      const number = controls.getByRole('spinbutton', { name: 'Fraction inspection time (s)', exact: true });
      const range = controls.getByRole('slider', { name: 'Scrub energy after shaking', exact: true });
      const status = controls.locator('[data-guide-decay-time-status]');
      for (const control of [number, range]) {
        await expect(control).toHaveAttribute('min', '16');
        await expect(control).toHaveAttribute('max', '24');
        await expect(control).toHaveAttribute('step', '0.001');
      }
      await checkGuideDecayFractions(current, oracle, pairInputs, 16);
      await expect(number).toHaveValue('16.000');
      await expect(status).toHaveText('16.000 s overall · 0.000 s after shaking ended');

      // Native keyboard controls pause active playback and retain the learner's focus.
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.getByRole('button', { name: 'Run earthquake', exact: true }).click();
      await expect.poll(() => page.evaluate(() => (window as any).__bucket().seismicPlaying)).toBe(true);
      await range.focus();
      await range.press('End');
      await expect(range).toBeFocused();
      await checkGuideDecayFractions(current, oracle, pairInputs, 24);
      expect(await page.evaluate(() => (window as any).__bucket())).toMatchObject({ seismicTime: 24, seismicPlaying: false, autoDriving: false });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await range.press('Home');
      await expect(range).toBeFocused();
      await checkGuideDecayFractions(current, oracle, pairInputs, 16);
      await range.press('ArrowRight');
      await expect(range).toBeFocused();
      await checkGuideDecayFractions(current, oracle, pairInputs, 16.001);

      // Pointer scrubbing uses the native track; validate whichever millisecond it selects.
      await range.scrollIntoViewIfNeeded();
      const track = await range.boundingBox();
      expect(track).not.toBeNull();
      await range.click({ position: { x: track!.width * 0.62, y: track!.height / 2 } });
      await expect(range).toBeFocused();
      const pointerTime = await page.evaluate(() => (window as any).__bucket().seismicTime);
      expect(pointerTime).toBeGreaterThan(16);
      expect(pointerTime).toBeLessThan(24);
      await checkGuideDecayFractions(current, oracle, pairInputs, pointerTime);

      // Partial numeric drafts must survive rerenders before becoming a valid time.
      await number.fill('2');
      await expect(number).toBeFocused();
      await expect(number).toHaveValue('2');
      expect(await page.evaluate(() => (window as any).__bucket().seismicTime)).toBe(pointerTime);
      await number.fill('21.217');
      await number.press('Enter');
      await expect(number).toBeFocused();
      await expect(number).toHaveValue('21.217');
      await expect(range).toHaveValue('21.217');
      await expect(range).toHaveAttribute('aria-valuetext', '21.217 s overall · 5.217 s after shaking ended');
      await expect(number).toHaveAttribute('aria-valuetext', '21.217 s overall · 5.217 s after shaking ended');
      await expect(status).toHaveText('21.217 s overall · 5.217 s after shaking ended');
      const live = await checkGuideDecayFractions(current, oracle, pairInputs, 21.217);
      await captureImmersiveRegion(page, live, 'decay-time-' + width + '-controls.png', report);

      await guide.getByRole('button', { name: 'Record paired evidence', exact: true }).click();
      const recorded = guide.locator('[data-guide-readings="recorded"]');
      await openGuideDecayFractions(recorded);
      await expect(recorded.locator('[data-guide-decay-time-controls]')).toHaveCount(0);
      const recordedSnapshot = await guideDecaySnapshot(await checkGuideDecayFractions(recorded, oracle, pairInputs, 21.217));
      const recordedText = await recorded.textContent();
      const evidence = await page.evaluate(() => JSON.stringify((window as any).__bucket().seismicGuideEvidence));
      await range.focus();
      await range.press('End');
      await expect(range).toBeFocused();
      await checkGuideDecayFractions(current, oracle, pairInputs, 24);
      await expect(number).toHaveValue('24.000');

      // Losing graphics must leave local inspection available in the labelled elevation.
      await page.locator('[data-allo-fs-stage]').scrollIntoViewIfNeeded();
      await page.evaluate(() => {
        const canvas = document.querySelector('canvas[data-bridge-gl]') as HTMLCanvasElement;
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        const loss = gl?.getExtension('WEBGL_lose_context');
        if (!loss) throw Error('No graphics loss extension');
        (window as any).__decayTimeLoss = loss;
        loss.loseContext();
      });
      await expect(page.locator('[data-bridge-elevation]')).toBeVisible();
      await expect(current.locator('[data-guide-decay-disclosure]')).toHaveAttribute('open', '');
      await number.fill('16');
      await number.press('Enter');
      await expect(number).toBeFocused();
      await checkGuideDecayFractions(current, oracle, pairInputs, 16);
      await number.fill('24');
      await number.press('Enter');
      await expect(number).toBeFocused();
      await expect(number).toHaveValue('24.000');
      await expect(status).toHaveText('24.000 s overall · 8.000 s after shaking ended');
      await captureImmersiveRegion(page, await checkGuideDecayFractions(current, oracle, pairInputs, 24),
        'decay-time-' + width + '-fallback.png', report);
      await page.evaluate(() => (window as any).__decayTimeLoss.restoreContext());
      await expect.poll(() => page.evaluate(() => (window as any).__gl().state)).toBe('ready');
      expect(await guideDecaySnapshot(await checkGuideDecayFractions(recorded, oracle, pairInputs, 21.217))).toEqual(recordedSnapshot);
      expect(await recorded.textContent()).toBe(recordedText);
      expect(await page.evaluate(() => JSON.stringify((window as any).__bucket().seismicGuideEvidence))).toBe(evidence);
      expect(await page.evaluate(() => JSON.stringify((window as any).__bucket().seismicTrials))).toBe(savedTrials);
      expect(await page.evaluate(() => JSON.stringify((window as any).__bucket().seismicGuideBaseline))).toBe(guideBaseline);
      expect(await page.evaluate(() => (window as any).__bucket())).toMatchObject({
        bridgeView: '2d', seismicSceneSource: 'guide', seismicSceneTrial: 'reference',
        seismicTime: 24, seismicIntervalPinS: 7.217, seismicPlaying: false, autoDriving: false,
        seismicPrediction: 'Keep time prediction', seismicObservation: 'Keep time observation',
        seismicSceneNote: 'Keep time scene note', seismicGuidePrediction: 'Keep time guide prediction',
        seismicGuideClaim: 'Keep time guide claim', seismicGuideReasoning: 'Keep time guide reasoning'
      });
      await checkWorkflowHealth(page);
      await guide.getByRole('button', { name: 'Open investigation report', exact: true }).click();
      const printedGuide = page.locator('[data-bridge-damping-guide="print"]');
      await expect(printedGuide.locator('[data-guide-decay-time-controls],input,button,select,textarea')).toHaveCount(0);
      expect(await guideDecaySnapshot(await checkGuideDecayFractions(
        printedGuide.locator('[data-guide-readings="recorded"]'), oracle, pairInputs, 21.217
      ))).toEqual(recordedSnapshot);
      await checkWorkflowHealth(page);
    });
  }

  for (const width of [1000, 320]) {
    test('starting energy: trace shaking work into preserved paired evidence at ' + width + 'px', async ({ page }) => {
      const oracle = await loadGuideEnergyOracle();
      const report = process.env.BRIDGE_REPORT_DIR || join(ROOT, 'reports', 'bridgelab-starting-energy-2026-10-05');
      await mkdir(report, { recursive: true });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const writing = { seismicPrediction: 'Keep starting-energy prediction', seismicObservation: 'Keep starting-energy observation',
        seismicSceneNote: 'Keep starting-energy scene note', seismicGuidePrediction: 'Keep starting-energy guide prediction',
        seismicGuideClaim: 'Keep starting-energy claim', seismicGuideReasoning: 'Keep starting-energy reasoning' };
      await mountWorkflow(page, width, { ...writing, bridgeView: '3d', seismicEnabled: true,
        seismicGuideOpen: true, seismicEnergyInterval: true, seismicIntervalPinS: 7.217 });
      const guide = page.locator('[data-bridge-damping-guide="interactive"]');
      const current = guide.locator('[data-guide-readings="current"]');
      const prepare = guide.getByRole('button', { name: 'Prepare 5% / 20% comparison', exact: true });
      await prepare.click();
      await expect(current.locator('[data-guide-shaking-disclosure]')).toHaveCount(0);
      await page.evaluate(() => (window as any).__set({ seismicTime: 15.999 }));
      await expect(current.locator('[data-guide-shaking-disclosure]')).toHaveCount(0);
      const inspect16 = guide.getByRole('button', { name: 'Inspect both at 16 s', exact: true });
      await inspect16.focus();
      await inspect16.press('Enter');
      await expect(inspect16).toBeFocused();
      const disclosure = current.locator('[data-guide-shaking-disclosure]');
      const summary = disclosure.locator(':scope > summary');
      await expect(disclosure).not.toHaveAttribute('open', '');
      await expect(current.locator('[data-guide-shaking-budget]')).toBeHidden();
      await openGuideStartingEnergy(current);
      let inputs = await guidePairInputs(page);
      let frame = await checkGuideStartingEnergy(current, oracle, inputs);
      const initial = await guideStartingSnapshot(frame);
      await expect(frame.locator('[data-guide-shaking-controlled]')).toBeVisible();
      expect(initial[0].values.find(reading => reading.field === 'input')!.value)
        .not.toBe(initial[1].values.find(reading => reading.field === 'input')!.value);
      await summary.press('Space');
      await expect(disclosure).not.toHaveAttribute('open', '');
      await summary.press('Enter');
      await expect(summary).toBeFocused();
      await page.evaluate(() => (window as any).__set({ seismicTime: 24 }));
      await expect(summary).toBeFocused();
      expect(await guideStartingSnapshot(await checkGuideStartingEnergy(current, oracle, inputs))).toEqual(initial);
      await captureImmersiveRegion(page, frame, 'starting-energy-' + width + '-controlled.png', report);

      // A nearby learner control changes the after-shaking fraction; the 0–16 s provenance stays fixed.
      await openGuideDecayFractions(current);
      const number = current.getByRole('spinbutton', { name: 'Fraction inspection time (s)', exact: true });
      await number.fill('21.217');
      await number.press('Enter');
      await expect(number).toBeFocused();
      await checkGuideDecayFractions(current, oracle, inputs, 21.217);
      expect(await guideStartingSnapshot(await checkGuideStartingEnergy(current, oracle, inputs))).toEqual(initial);

      // Exact zero and tiny input amounts keep their model meaning on a narrow screen.
      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 0 }));
      inputs = await guidePairInputs(page);
      frame = await checkGuideStartingEnergy(current, oracle, inputs);
      await expect(frame.locator('[data-guide-shaking-controlled]')).toHaveCount(0);
      for (const reading of await frame.locator('[data-guide-shaking-trial="b"] [data-guide-shaking-field]').all()) {
        await expect(reading).toHaveAttribute('data-guide-shaking-value', '0');
      }
      await page.evaluate(() => (window as any).__set({ seismicIntensityG: 0.000001 }));
      await prepare.click();
      await guide.getByRole('button', { name: 'Inspect both at 24 s', exact: true }).click();
      await openGuideStartingEnergy(current);
      inputs = await guidePairInputs(page);
      frame = await checkGuideStartingEnergy(current, oracle, inputs);
      for (const reading of await frame.locator('[data-guide-shaking-field="input"],[data-guide-shaking-field="damping"],[data-guide-shaking-field="stored"]').all()) {
        const raw = Number(await reading.getAttribute('data-guide-shaking-value'));
        expect(raw).toBeGreaterThan(0);
        expect(raw).toBeLessThan(0.001);
      }

      const tinyBars = await guideStartingSnapshot(frame);
      for (const [index, trial] of tinyBars.entries()) {
        expect(trial.bars.map(bar => bar.field)).toEqual(initial[index].bars.map(bar => bar.field));
        for (const [segment, bar] of trial.bars.entries()) {
          expect(Number(bar.x)).toBeCloseTo(Number(initial[index].bars[segment].x), 7);
          expect(Number(bar.width)).toBeCloseTo(Number(initial[index].bars[segment].width), 7);
        }
      }

      // Record differing ground motions and rebuild those inputs after the live pair changes.
      await page.evaluate(() => (window as any).__set({ seismicFrequencyHz: 0.65, seismicTime: 21.217 }));
      inputs = await guidePairInputs(page);
      await guide.getByRole('button', { name: 'Record paired evidence', exact: true }).click();
      const recorded = guide.locator('[data-guide-readings="recorded"]');
      await openGuideStartingEnergy(recorded);
      const recordedFrame = await checkGuideStartingEnergy(recorded, oracle, inputs);
      const saved = await guideStartingSnapshot(recordedFrame);
      await expect(recordedFrame.locator('[data-guide-shaking-controlled]')).toHaveCount(0);
      await expect(recorded.locator('[data-guide-comparison-context]')).toHaveAttribute('data-guide-comparison-context', 'confounded');
      await captureImmersiveRegion(page, recordedFrame, 'starting-energy-' + width + '-recorded.png', report);
      const originalRecord = await page.evaluate(() => (window as any).__bucket().seismicGuideEvidence);
      expect(Object.keys(originalRecord).sort()).toEqual(['currentInputs', 'referenceInputs', 'timeS', 'version']);
      await page.evaluate(() => (window as any).__set({ seismicFrequencyHz: 1.1, seismicIntensityG: 0.12 }));
      await prepare.click();
      await guide.getByRole('button', { name: 'Inspect both at 24 s', exact: true }).click();
      await expect(guide.locator('[data-guide-evidence]')).toHaveAttribute('data-guide-evidence', 'earlier');
      expect(await guideStartingSnapshot(await checkGuideStartingEnergy(recorded, oracle, inputs))).toEqual(saved);
      expect(await page.evaluate(() => (window as any).__bucket().seismicGuideEvidence)).toEqual(originalRecord);
      await checkWorkflowHealth(page);

      // A fresh disabled-model print has no cached answer, live controls or disclosure state.
      await page.evaluate(() => {
        const bucket = JSON.parse(JSON.stringify((window as any).__bucket()));
        bucket.tab = 'print'; bucket.seismicEnabled = false;
        bucket.seismicGuideEvidence.shakingBudget = { inputJPerKg: 999999, storedJPerKg: 999999 };
        (window as any).__destroy();
        (window as any).__mount(bucket);
      });
      const printedGuide = page.locator('[data-bridge-damping-guide="print"]');
      const printed = printedGuide.locator('[data-guide-readings="recorded"]');
      const printedFrame = await checkGuideStartingEnergy(printed, oracle, inputs);
      expect(await guideStartingSnapshot(printedFrame)).toEqual(saved);
      await expect(printedGuide.locator('details,summary,select,button,input,textarea')).toHaveCount(0);
      await expect(printedFrame.locator('[data-guide-shaking-controlled]')).toHaveCount(0);
      await expect(printedGuide).not.toContainText('999999');
      await page.emulateMedia({ media: 'print' });
      await checkGuideShakingLegend(printedFrame);
      await captureImmersiveRegion(page, printedFrame, 'starting-energy-' + width + '-print.png', report);
      await page.emulateMedia({ media: 'screen' });
      expect(await page.evaluate(() => (window as any).__bucket())).toMatchObject({ ...writing,
        seismicTime: 24, seismicIntervalPinS: 7.217, seismicEnabled: false });
      await checkWorkflowHealth(page);
    });
  }

});
