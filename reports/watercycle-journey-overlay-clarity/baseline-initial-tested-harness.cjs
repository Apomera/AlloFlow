'use strict';
// Owned browser review. Reads a pinned candidate and writes only fresh scratch evidence.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const REPO = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const { chromium } = require(path.join(REPO, 'node_modules/playwright'));
const option = name => (process.argv.find(arg => arg.startsWith('--' + name + '=')) || '').slice(name.length + 3);
const SOURCE = option('source'), PREFIX = option('run'), EXPECTED = option('sha');
const BASELINE = process.argv.includes('--baseline');
if (!path.isAbsolute(SOURCE) || !/^[a-z0-9-]+$/.test(PREFIX) || !/^[a-f0-9]{64}$/.test(EXPECTED)) {
  throw Error('Supply --source=absolute-file --sha=exact-sha256 --run=fresh-prefix; optional --baseline');
}
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const source = fs.readFileSync(SOURCE), sourceText = source.toString('utf8');
if (hash(source) !== EXPECTED) throw Error('Pinned source hash mismatch');
const OUT = path.join(__dirname, 'journey-overlay-review');
fs.mkdirSync(OUT, { recursive: true });
if (fs.readdirSync(OUT).some(file => file.startsWith(PREFIX + '-'))) throw Error('Evidence prefix exists; use a fresh --run');
fs.writeFileSync(path.join(OUT, PREFIX + '-tested-runtime.js'), source);
fs.writeFileSync(path.join(OUT, PREFIX + '-tested-harness.cjs'), fs.readFileSync(__filename));
const declaration = name => {
  const start = sourceText.indexOf('var ' + name + ' =');
  if (start < 0) throw Error('Missing source table ' + name);
  const end = sourceText.indexOf('\n', sourceText.indexOf('};', start));
  return sourceText.slice(start, end);
};
const expected = new Function(declaration('MATTER_ENERGY_TRACE') + '\n' + declaration('JOURNEY_MATTER_ENERGY_TRACE') + '\n' + declaration('JOURNEY_STATE_LABELS') + '\nreturn { phases:JOURNEY_MATTER_ENERGY_TRACE, labels:JOURNEY_STATE_LABELS };')();
const states = Object.keys(expected.labels), norm = value => String(value).replace(/\s+/gu, ' ').trim();
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const seed = {
  wcMode: 'explorer', wcSection: 'journey', journeyView: '2d', journeyActive: true,
  journeyState: 'condensing', journeyLastPath: 'runoff', journeyPaused: true, wc2dPaused: true,
  activeStage: 'condensation', journeySpeed: 1, journeyLoops: 2,
  journeyPaths: { runoff: 1, infiltrate: 1, plant: 0 }, xp: 73, score: 4, researchPoints: 10,
  completedChallenges: ['complete_journey', 'adjust_climate'], climSolar: 1.2, climTemp: 18, climWind: 1.4,
  landRainIntensity: 60, landSaturation: 50, landPermeability: 'medium', landSlope: 'moderate', landCover: 'grass',
  wcExperimentLog: [{ key: 'saved-record', notes: { explanation: 'Saved observation' } }],
  wcCheckReflections: { saved: { observation: 'Saved learner explanation' } }
};
const stageMap = { idle: 'condensation', ocean: 'collection', evaporating: 'evaporation', condensing: 'condensation', precipitating: 'precipitation', ground_choice: 'precipitation', river_runoff: 'collection', infiltrating: 'infiltration', aquifer_flow: 'infiltration', plant_absorb: 'transpiration', transpiring: 'transpiration', complete: 'collection' };
const cases = [];
for (const width of [320, 390, 1040]) for (const state of states) cases.push({ state, width, theme: 'light', forcedColors: 'none' });
for (const theme of ['dark', 'contrast']) for (const [state, width] of [['condensing', 320], ['ground_choice', 390], ['aquifer_flow', 1040]]) cases.push({ state, width, theme, forcedColors: 'none' });
for (const [state, width] of [['ground_choice', 320], ['plant_absorb', 390], ['infiltrating', 1040]]) cases.push({ state, width, theme: 'contrast', forcedColors: 'active' });
const report = {
  mode: BASELINE ? 'baseline' : 'candidate', prefix: PREFIX, pid: process.pid, startedAt: new Date().toISOString(),
  sourcePath: SOURCE, sourceSha256: EXPECTED, sourceBytes: source.length,
  harnessSha256: hash(fs.readFileSync(__filename)), url: 'http://127.0.0.1:8770/?mode=explore',
  checks: [], cases: [], captures: [], nativeActions: [], errors: [], consoleErrors: [],
  completed: false, successful: false, browserClosed: false, resourcesClosed: false, serverOwned: false
};
const save = () => fs.writeFileSync(path.join(OUT, PREFIX + '-results.json'), JSON.stringify(report, null, 2));
const check = (label, passed, details) => { report.checks.push({ label, passed: !!passed, details }); if (!passed) report.errors.push(label); };
const overlap = (a, b, tolerance = .4) => a.x < b.x + b.w - tolerance && b.x < a.x + a.w - tolerance && a.y < b.y + b.h - tolerance && b.y < a.y + a.h - tolerance;
async function settle(page) { await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); }
async function snapshot(page) {
  const result = await page.evaluate(() => {
    const canvas = document.getElementById('wcCanvas'), pin = window.journeyReviewPin;
    return { data: JSON.parse(JSON.stringify(window.waterReviewData)), pixels: canvas.toDataURL(), dataset: { ...canvas.dataset },
      engine: { canvasSame: canvas === pin.canvas, contextSame: canvas.getContext('2d') === pin.context,
        hooks: Object.keys(pin.hooks).map(name => ({ name, type: typeof canvas[name], same: canvas[name] === pin.hooks[name] })) } };
  });
  result.canvasSha256 = hash(result.pixels); delete result.pixels; return result;
}
function retained(result) { return result.engine.canvasSame && result.engine.contextSame && result.engine.hooks.every(hook => hook.type === 'function' && hook.same); }
async function mount(page, item, progress = .8) {
  await page.setViewportSize({ width: item.width, height: 1100 });
  await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: item.forcedColors });
  await page.evaluate(({ seed, item, stageMap }) => mountWater({ ...seed, journeyState: item.state, journeyActive: item.state !== 'idle', activeStage: stageMap[item.state] }, item.theme), { seed, item, stageMap });
  await page.waitForSelector('#wcCanvas');
  await page.locator('#wcCanvas').evaluate((canvas, progress) => {
    if (typeof canvas._wcSetJourneyProgress !== 'function' || typeof canvas._wcRedraw !== 'function') throw Error('Missing original native engine hooks');
    canvas._wcSetJourneyProgress(progress);
    window.journeyReviewPin = { canvas, context: canvas.getContext('2d'), hooks: Object.fromEntries(['_wcSetJourneyProgress', '_wcRestartJourney', '_wcRedraw'].map(name => [name, canvas[name]])) };
  }, progress);
  await settle(page);
}
async function record(page) {
  return page.locator('#wcCanvas').evaluate(canvas => {
    // Observe the native calls of the latest forced frame; production source is never rewritten.
    const ctx = canvas.getContext('2d'), proto = CanvasRenderingContext2D.prototype;
    const names = ['clearRect', 'beginPath', 'roundRect', 'rect', 'fill', 'fillRect', 'fillText', 'save', 'restore'];
    const originals = Object.fromEntries(names.map(name => [name, proto[name]]));
    const receipt = { cards: [], evidence: [], stages: [], text: [], allText: [], frames: 0, methodsRestored: false, depth: 0, minimumDepth: 0 };
    const stageNames = new Set(['↑ Evaporation', '☁ Condensation', '↓ Precipitation', '🌊 Collection', '🌿 Transpiration', '🪴 Infiltration']);
    let pathRect = null, lastFillRect = null, activeCard = null, activeEvidence = null;
    const transform = (x, y) => { const t = ctx.getTransform(); return { x: t.a * x + t.c * y + t.e, y: t.b * x + t.d * y + t.f }; };
    const rect = args => { const a = transform(args[0], args[1]), b = transform(args[0] + args[2], args[1] + args[3]); return { x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y }; };
    const scope = () => { const stack = String(new Error().stack); return stack.includes('wcDrawJourneyCard2d') ? 'journey' : stack.includes('evidenceLabel2d') ? 'evidence' : 'other'; };
    const style = () => ({ fillStyle: String(ctx.fillStyle), alpha: ctx.globalAlpha, composite: ctx.globalCompositeOperation });
    try {
      for (const name of names) proto[name] = function (...args) {
        if (this !== ctx) return Reflect.apply(originals[name], this, args);
        const kind = scope();
        if (name === 'clearRect') {
          receipt.cards = []; receipt.evidence = []; receipt.stages = []; receipt.text = []; receipt.allText = []; receipt.frames++;
          pathRect = null; lastFillRect = null; activeCard = null; activeEvidence = null;
        } else if (name === 'save') receipt.depth++;
        else if (name === 'restore') { receipt.depth--; receipt.minimumDepth = Math.min(receipt.minimumDepth, receipt.depth); }
        else if (name === 'beginPath') pathRect = null;
        else if (name === 'roundRect' || name === 'rect') pathRect = { ...rect(args), operation: name };
        else if (name === 'fill' && pathRect) {
          const plate = { ...pathRect, ...style(), text: [] };
          if (kind === 'journey' && ctx.fillStyle === '#071c2c') { receipt.cards.push(plate); activeCard = plate; }
          else if (kind === 'evidence') { receipt.evidence.push(plate); activeEvidence = plate; }
        } else if (name === 'fillRect') lastFillRect = { ...rect(args), ...style() };
        else if (name === 'fillText') {
          const measured = ctx.measureText(String(args[0])), point = transform(args[1], args[2]), t = ctx.getTransform();
          const raw = { text: String(args[0]), argsCount: args.length, font: ctx.font, size: Number((ctx.font.match(/([\d.]+)px/) || [0, 0])[1]),
            x: point.x, y: point.y, width: measured.width * Math.abs(t.a), align: ctx.textAlign, baseline: ctx.textBaseline, kind, ...style(),
            bounds: { x: point.x - measured.actualBoundingBoxLeft * Math.abs(t.a), y: point.y - measured.actualBoundingBoxAscent * Math.abs(t.d),
              w: (measured.actualBoundingBoxLeft + measured.actualBoundingBoxRight) * Math.abs(t.a), h: (measured.actualBoundingBoxAscent + measured.actualBoundingBoxDescent) * Math.abs(t.d) } };
          receipt.allText.push(raw);
          if (kind === 'journey') { receipt.text.push(raw); if (activeCard) activeCard.text.push(raw); }
          else if (kind === 'evidence' && activeEvidence) activeEvidence.text.push(raw);
          else if (stageNames.has(raw.text)) receipt.stages.push({ ...(lastFillRect || raw.bounds), text: raw.text });
        }
        return Reflect.apply(originals[name], this, args);
      };
      canvas._wcRedraw();
    } finally { for (const name of names) proto[name] = originals[name]; receipt.methodsRestored = names.every(name => proto[name] === originals[name]); }
    const box = canvas.getBoundingClientRect(), scaleX = canvas.width / box.width, scaleY = canvas.height / box.height;
    receipt.chrome = [...canvas.parentElement.querySelectorAll('.wc-canvas-title, .wc-chip-row')].map(element => {
      const b = element.getBoundingClientRect(); return { text: element.textContent, x: (b.left - box.left) * scaleX, y: (b.top - box.top) * scaleY, w: b.width * scaleX, h: b.height * scaleY };
    }).filter(b => b.w > 0 && b.h > 0);
    receipt.width = canvas.width; receipt.height = canvas.height; receipt.scaleX = scaleX; receipt.scaleY = scaleY;
    receipt.cssBox = box.toJSON(); receipt.overflow = document.documentElement.scrollWidth > innerWidth + 1;
    receipt.dataset = { ...canvas.dataset }; receipt.ariaLabel = canvas.getAttribute('aria-label'); return receipt;
  });
}
async function capture(page, label, item) {
  const filename = PREFIX + '-' + label + '.png';
  await page.locator('#wcCanvas').screenshot({ path: path.join(OUT, filename), animations: 'disabled', timeout: 60000 });
  const bytes = fs.readFileSync(path.join(OUT, filename));
  report.captures.push({ path: filename, sha256: hash(bytes), bytes: bytes.length, width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), sourceSha256: EXPECTED, item, capturedAt: new Date().toISOString() });
}
let browser;
(async () => {
  try {
    browser = await chromium.launch({ headless: true }); report.browserLaunchedAt = new Date().toISOString(); save();
    const page = await browser.newPage({ viewport: { width: 1040, height: 1100 }, reducedMotion: 'reduce' }); page.setDefaultTimeout(30000);
    page.on('pageerror', error => report.errors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error') report.consoleErrors.push(message.text()); });
    let routedCount = 0;
    await page.route('**/stem_lab/stem_tool_watercycle.js', async route => { routedCount++; await route.fulfill({ status: 200, contentType: 'text/javascript', body: source }); });
    // Attach the rejection handler immediately, including when navigation fails.
    const loaded = page.waitForResponse(response => new URL(response.url()).pathname === '/stem_lab/stem_tool_watercycle.js').then(response => ({ response }), error => ({ error: String(error) }));
    await page.goto(report.url, { waitUntil: 'load' });
    const responseReceipt = await loaded;
    if (responseReceipt.error) throw Error(responseReceipt.error);
    const loadedBytes = await responseReceipt.response.body(); report.loadedRuntimeSha256 = hash(loadedBytes); report.loadedRuntimeBytes = loadedBytes.length;
    check('Native browser loaded exact routed runtime', routedCount === 1 && report.loadedRuntimeSha256 === EXPECTED && report.loadedRuntimeBytes === source.length, { routedCount, sha256: report.loadedRuntimeSha256, bytes: report.loadedRuntimeBytes });
    await page.waitForFunction(() => typeof window.mountWater === 'function' && typeof window.waterReviewData === 'object');
    for (const item of cases) {
      const label = item.state + '-' + item.theme + '-' + item.width + (item.forcedColors === 'active' ? '-forced' : '');
      await mount(page, item); const before = await snapshot(page); const evidence = await record(page);
      report.cases.push({ label, item, ...evidence });
      check(label + ' mounts original paused 2D engine and complete stage labels', evidence.dataset.journeyState === item.state && evidence.dataset.journeyPaused === 'true' && retained(before) && evidence.stages.length === 6 && !!evidence.ariaLabel, { dataset: evidence.dataset, stages: evidence.stages, engine: before.engine });
      check(label + ' restores native recorder and balanced canvas context', evidence.methodsRestored && evidence.depth === 0 && evidence.minimumDepth === 0 && evidence.frames >= 1, { restored: evidence.methodsRestored, depth: evidence.depth, minimumDepth: evidence.minimumDepth, frames: evidence.frames });
      check(label + ' fits viewport', !evidence.overflow && evidence.cssBox.width >= 200, evidence.cssBox);
      if (!BASELINE) {
        const text = norm(evidence.text.map(call => call.text).join(' '));
        check(label + ' actual caption visibility follows active journey', item.state === 'idle' ? evidence.cards.length === 0 && evidence.text.length === 0 : evidence.cards.length > 0 && evidence.text.length > 0, { cards: evidence.cards.length, text: evidence.text.length });
        if (item.state !== 'idle') {
          const phase = expected.phases[item.state];
          check(label + ' retains exact state title at 80 percent progress', text.includes(norm(expected.labels[item.state])), { expected: expected.labels[item.state], text });
          check(label + ' retains exact source phase wording', text.includes(norm(phase.phaseFrom)) && text.includes(norm(phase.phaseTo)), { expected: phase, text });
          check(label + ' uses natural text and at least 11 CSS px', evidence.text.every(call => call.argsCount === 3 && call.size / evidence.scaleX >= 10.99), evidence.text);
          check(label + ' uses opaque dark plates and readable title/body colors', evidence.cards.every(card => card.fillStyle === '#071c2c' && card.alpha === 1 && card.composite === 'source-over' && card.text.every((call, index) => call.fillStyle === (index === 0 ? '#f8fafc' : '#d7edf5') && call.alpha === 1)), { plates: evidence.cards, text: evidence.text });
          const outside = evidence.cards.filter(card => !(card.x >= -.1 && card.y >= -.1 && card.x + card.w <= evidence.width + .1 && card.y + card.h <= evidence.height + .1));
          const textOutside = evidence.cards.flatMap(card => card.text.filter(call => call.bounds.x < card.x - .5 || call.bounds.y < card.y - .5 || call.bounds.x + call.bounds.w > card.x + card.w + .5 || call.bounds.y + call.bounds.h > card.y + card.h + .5).map(call => ({ card, call })));
          check(label + ' contains complete text within plates and canvas', outside.length === 0 && textOutside.length === 0, { outside, textOutside });
          const clashes = [];
          for (let index = 0; index < evidence.cards.length; index++) {
            const card = evidence.cards[index];
            for (const other of evidence.cards.slice(index + 1)) if (overlap(card, other)) clashes.push({ kind: 'other journey card', card, other });
            for (const other of [...evidence.evidence, ...evidence.stages, ...evidence.chrome]) if (overlap(card, other)) clashes.push({ kind: 'reserved evidence/stage/chrome', card, other });
          }
          check(label + ' clears actual evidence stage and DOM captions', clashes.length === 0, clashes);
          if (item.state === 'ground_choice') check(label + ' retains distinct R U P route prefixes', [/\bR\b/u, /\bU\b/u, /\bP\b/u].every(prefix => prefix.test(text)) && evidence.cards.length >= 4, text);
        }
      }
      const settled = await snapshot(page);
      // Representative matched baseline/candidate captures; every scene still has native measurements.
      if ((item.theme === 'light' && [320, 1040].includes(item.width) && ['condensing', 'ground_choice', 'aquifer_flow', 'plant_absorb'].includes(item.state)) || item.theme !== 'light') await capture(page, label, item);
      const after = await snapshot(page);
      check(label + ' passive repaint and capture preserve learner work scores progress and engine', same(before.data, settled.data) && same(before.data, after.data) && settled.canvasSha256 === after.canvasSha256 && before.dataset.journeyProgress === after.dataset.journeyProgress && retained(settled) && retained(after), { beforeData: before.data, afterData: after.data, beforeProgress: before.dataset.journeyProgress, afterProgress: after.dataset.journeyProgress, settledPixels: settled.canvasSha256, afterPixels: after.canvasSha256, engine: after.engine });
      save();
    }
    for (const width of [320, 1040]) for (const route of [{ key: 'runoff', state: 'river_runoff', x: .29, y: .67 }, { key: 'infiltrate', state: 'infiltrating', x: .37, y: .76 }, { key: 'plant', state: 'plant_absorb', x: .59, y: .60 }]) {
      const item = { state: 'ground_choice', width, theme: 'light', forcedColors: 'none' }; await mount(page, item, 0);
      const before = await snapshot(page), box = await page.locator('#wcCanvas').boundingBox();
      await page.locator('#wcCanvas').click({ position: { x: box.width * route.x, y: box.height * route.y } });
      await page.waitForFunction(state => window.waterReviewData.journeyState === state, route.state); await settle(page);
      const after = await snapshot(page), pathsBefore = before.data.journeyPaths, pathsAfter = after.data.journeyPaths;
      const deltas = Object.fromEntries(['runoff', 'infiltrate', 'plant'].map(key => [key, Number(pathsAfter[key]) - Number(pathsBefore[key])]));
      const label = 'Native original ' + route.key + ' center at ' + width;
      report.nativeActions.push({ label, route, before, after, deltas, point: { x: box.x + box.width * route.x, y: box.y + box.height * route.y } });
      check(label + ' chooses matching route and increments one path counter', after.dataset.journeyState === route.state && after.data.journeyState === route.state && after.data.journeyLastPath === route.key && Object.entries(deltas).every(([key, delta]) => delta === (key === route.key ? 1 : 0)), { state: after.dataset.journeyState, data: after.data, deltas });
      check(label + ' retains scores saved explanations and native engine', ['xp', 'score', 'researchPoints', 'wcExperimentLog', 'wcCheckReflections', 'completedChallenges'].every(key => same(before.data[key], after.data[key])) && retained(after), { engine: after.engine, beforeData: before.data, afterData: after.data });
      save();
    }
    check('Pinned input source unchanged during browser review', hash(fs.readFileSync(SOURCE)) === EXPECTED);
    check('Browser emits no console errors', report.consoleErrors.length === 0, report.consoleErrors);
    report.completed = true; report.successful = report.errors.length === 0;
  } catch (error) { report.errors.push(error.stack || String(error)); }
  finally {
    if (browser) { try { await browser.close(); report.browserClosed = true; report.browserClosedAt = new Date().toISOString(); } catch (error) { report.errors.push('Browser close: ' + String(error)); } }
    report.resourcesClosed = report.browserClosed; report.completedAt = new Date().toISOString(); report.successful = report.completed && report.errors.length === 0 && report.resourcesClosed;
    save(); console.log(JSON.stringify({ prefix: PREFIX, mode: report.mode, completed: report.completed, successful: report.successful, checks: report.checks.length, cases: report.cases.length, captures: report.captures.length, nativeActions: report.nativeActions.length, errors: report.errors, browserClosed: report.browserClosed }));
    if (!report.successful) process.exitCode = 1;
  }
})();
