'use strict';

// Owns only fresh, explicitly named runs in the Storm caption report directory.
// Runtime code is mounted unmodified; native canvas wrappers observe actual paint.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'reports', 'watercycle-storm-caption-clarity');
const baseline = process.argv.includes('--baseline');
const mode = baseline ? 'baseline' : 'browser';
const run = (process.argv.find(arg => arg.startsWith('--run=')) || '').slice(6);
const expected = process.argv.find(arg => /^[a-f0-9]{64}$/.test(arg));
if (!/^[a-z0-9][a-z0-9-]{1,40}$/.test(run)) throw Error('Supply a fresh --run=lowercase-name prefix');
const read = file => fs.readFileSync(path.join(ROOT, file));
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const sourcePath = baseline ? 'reports/watercycle-storm-caption-clarity/baseline-runtime.js' : 'stem_lab/stem_tool_watercycle.js';
const source = read(sourcePath);
if (!expected || sha(source) !== expected) throw Error('Supply the exact runtime SHA: ' + sha(source));
fs.mkdirSync(OUT, { recursive: true });
const prefix = mode + '-' + run;
if (fs.readdirSync(OUT).some(name => name.startsWith(prefix + '-'))) throw Error('Run prefix already exists: ' + prefix);
fs.writeFileSync(path.join(OUT, prefix + '-tested-runtime.js'), source);
fs.writeFileSync(path.join(OUT, prefix + '-tested-harness.cjs'), fs.readFileSync(__filename));
const stable = value => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;
const same = (a, b) => JSON.stringify(stable(a)) === JSON.stringify(stable(b));
const report = {
  mode, run, pid: process.pid, startedAt: new Date().toISOString(), sourcePath,
  sourceSha256: sha(source), sourceBytes: source.length, harnessSha256: sha(fs.readFileSync(__filename)),
  publicSha256AtStart: sha(read('desktop/web-app/public/stem_lab/stem_tool_watercycle.js')),
  instrumentation: 'Native CanvasRenderingContext2D wrappers; runtime mounted without changes',
  checks: [], cases: [], captures: [], nativeActions: [], errors: [], consoleErrors: [],
  completed: false, successful: false, browserClosed: false, resourcesClosed: false,
};
let lastSaved = 0;
function save(force = false) {
  if (!force && Date.now() - lastSaved < 400) return;
  lastSaved = Date.now();
  fs.writeFileSync(path.join(OUT, prefix + '-results.json'), JSON.stringify(report, null, 2));
}
function check(label, passed, details) {
  report.checks.push({ label, passed: !!passed, details });
  if (!passed) report.errors.push(label);
  save();
}
const seed = {
  wcMode: 'precipHunt', xp: 73, score: 4, researchPoints: 10, wcAttempts: 4, wcStreak: 1,
  wcExperimentLog: [{ key: 'preserve-evidence', notes: 'Existing learner observation' }],
  completedChallenges: ['quiz_pass', 'vocabulary_studied'],
  precipHunt: { viewMode: '2d', paused: true, stormAutoPlay: false, stormTime: 52,
    soundEnabled: false, showAirflow: true, showStormAnatomy: false, cameraFocus: 'storm',
    environment: 'forest', experiment: { prediction: 'Saved prediction stays', explanation: 'Saved explanation stays',
      saved: [{ id: 1, a: { humidity: 65 }, b: { humidity: 75 }, prediction: 'Pinned prediction', explanation: 'Pinned explanation' }] } },
};
const sleet = { moisture: 90, tempC: -10, midLevelTempC: 1, surfaceTempC: -4,
  lowLevelHumidity: 85, wind: 10, updraft: 70, cloudDepth: 9, terrain: 'plains' };
const cases = [
  { id: 'rain-desktop', preset: 'gentleRain', phase: 'rain', width: 1280 },
  { id: 'snow-desktop', preset: 'mountainSnow', phase: 'snow', width: 1280 },
  { id: 'sleet-desktop', extra: sleet, phase: 'sleet', width: 1280 },
  { id: 'freezing-rain-desktop', preset: 'freezingRain', phase: 'freezing-rain', width: 1280 },
  { id: 'virga-desktop', preset: 'virga', phase: 'virga', width: 1280 },
  { id: 'orographic-west-desktop', preset: 'mountainSnow', phase: 'snow', extra: { windDirection: 'west' }, width: 1280 },
  { id: 'sleet-phone320', extra: sleet, phase: 'sleet', width: 320 },
  { id: 'virga-phone320', preset: 'virga', phase: 'virga', width: 320 },
  { id: 'orographic-east-phone320', preset: 'mountainSnow', phase: 'snow', width: 320 },
  { id: 'orographic-west-phone320', preset: 'mountainSnow', phase: 'snow', extra: { windDirection: 'west' }, width: 320 },
  { id: 'freezing-rain-phone390', preset: 'freezingRain', phase: 'freezing-rain', width: 390 },
  { id: 'summer-dark', preset: 'summerStorm', phase: 'rain', width: 1280, dark: true },
  { id: 'hail-anatomy', preset: 'hailstorm', phase: 'hail', extra: { showStormAnatomy: true }, width: 1280 },
  { id: 'near-zero-desktop', extra: { ...sleet, tempC: -.00004, midLevelTempC: .00004, surfaceTempC: -.00004 }, width: 1280 },
  { id: 'mountain-calm-phone390', preset: 'mountainSnow', phase: 'snow', extra: { wind: 0 }, width: 390 },
];
let browser;
let page;
async function painted() {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
async function mount(fixture) {
  await page.setViewportSize({ width: fixture.width, height: 1000 });
  await page.evaluate(({ seed, fixture }) => {
    const setup = { ...WaterCyclePrecipitationKernel.presets[fixture.preset || 'gentleRain'],
      ...seed.precipHunt, preset: fixture.preset || 'custom', ...(fixture.extra || {}) };
    mountStormCaption({ ...seed, precipHunt: setup }, fixture);
  }, { seed, fixture });
  await page.waitForSelector('#wcPrecipCanvas');
  await painted();
  await page.evaluate(() => {
    const canvas = document.getElementById('wcPrecipCanvas');
    window.stormCaptionPin = { canvas, context: canvas.getContext('2d'),
      sync: canvas._wcPrecipSync, cleanup: canvas._wcPrecipCleanup };
  });
}
async function snapshot() {
  const value = await page.evaluate(() => {
    const canvas = document.getElementById('wcPrecipCanvas');
    const pin = stormCaptionPin;
    return { data: JSON.parse(JSON.stringify(stormCaptionData)), awards: JSON.parse(JSON.stringify(stormCaptionAwards)),
      canvasPixels: canvas.toDataURL(), width: canvas.getBoundingClientRect().width, height: canvas.getBoundingClientRect().height,
      pixelWidth: canvas.width, pixelHeight: canvas.height, dataset: { ...canvas.dataset },
      engine: { canvas: pin.canvas === canvas, context: pin.context === canvas.getContext('2d'),
        sync: pin.sync === canvas._wcPrecipSync, cleanup: pin.cleanup === canvas._wcPrecipCleanup,
        syncType: typeof canvas._wcPrecipSync, cleanupType: typeof canvas._wcPrecipCleanup } };
  });
  value.canvasSha256 = sha(value.canvasPixels);
  delete value.canvasPixels;
  return value;
}
async function evidence() {
  return page.evaluate(() => ({ ...stormCaptionPaint,
    model: JSON.parse(JSON.stringify(WaterCyclePrecipitationKernel.compute(stormCaptionData.precipHunt))),
    logicalWidth: Math.round(document.getElementById('wcPrecipCanvas').getBoundingClientRect().width),
    logicalHeight: Math.round(document.getElementById('wcPrecipCanvas').getBoundingClientRect().height),
    pageOverflow: document.documentElement.scrollWidth > innerWidth + 1 }));
}
function captionChecks(label, value) {
  const cards = value.cards;
  const captionText = card => card.texts.map(item => item.text).join(' ').replace(/\s+/g, ' ').trim();
  const allText = cards.map(captionText).join(' | ');
  const contrast = (one, two) => {
    const luminance = hex => hex.slice(1).match(/../g).map(value => parseInt(value, 16) / 255)
      .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
      .reduce((sum, value, i) => sum + value * [.2126, .7152, .0722][i], 0);
    const levels = [luminance(one), luminance(two)];
    return (Math.max(...levels) + .05) / (Math.min(...levels) + .05);
  };
  check(label + ' actual caption helper paints rounded plates', cards.length >= 5 && cards.every(card => card.rounded), cards);
  check(label + ' caption fonts at least11px without compression', cards.every(card => card.texts.length && card.texts.every(item => item.fontSize >= 11 && item.argumentCount === 3)), cards);
  check(label + ' opaque plates provide measured text contrast', cards.every(card => card.fill === '#071c2c' && card.alpha === 1 && card.texts.every(item => /^#[a-f0-9]{6}$/i.test(item.fill) && contrast(item.fill, card.fill) >= 4.5)), cards);
  check(label + ' plates stay inside the actual canvas', cards.every(card => card.bounds.x >= -.1 && card.bounds.y >= -.1 && card.bounds.right <= value.logicalWidth + .1 && card.bounds.bottom <= value.logicalHeight + .1), cards.map(card => card.bounds));
  const overlaps = [];
  for (let a = 0; a < cards.length; a++) for (let b = a + 1; b < cards.length; b++) {
    const one = cards[a].bounds, two = cards[b].bounds;
    const width = Math.min(one.right, two.right) - Math.max(one.x, two.x);
    const height = Math.min(one.bottom, two.bottom) - Math.max(one.y, two.y);
    if (width > .1 && height > .1) overlaps.push({ a, b, width, height });
  }
  check(label + ' caption plates do not overlap', overlaps.length === 0, overlaps);
  check(label + ' measured text remains inside its plate', cards.every(card => card.texts.every(item => item.bounds.x >= card.bounds.x - .6 && item.bounds.y >= card.bounds.y - .6 && item.bounds.right <= card.bounds.right + .6 && item.bounds.bottom <= card.bounds.bottom + .6)), cards);
  check(label + ' title precedes body with natural line order', cards.every(card => /^800 /.test(card.texts[0]?.font || '') && card.texts.every((item, i) => i === 0 || item.y > card.texts[i - 1].y - .1) && !card.texts.some((item, i) => /^800 /.test(item.font) && card.texts.slice(0, i).some(earlier => /^600 /.test(earlier.font)))), cards);
  const cloud = cards.find(card => /^Cloud formation\b/i.test(captionText(card)));
  check(label + ' cloud caption matches actual modeled cloud phase', !!cloud && captionText(cloud) === 'Cloud formation ' + value.model.cloudPhase, { expected: value.model.cloudPhase, actual: cloud && captionText(cloud) });
  const crossings = cards.filter(card => /0\s*°C crossing/i.test(captionText(card)));
  check(label + ' crossing captions match actual thermal boundaries', crossings.length === value.model.thermalLayers.crossings.length && value.model.thermalLayers.crossings.every((crossing, i) => captionText(crossings[i] || { texts: [] }) === '0°C crossing ' + (crossing.kind === 'melting' ? 'Warmer below · schematic' : 'Colder below · schematic')), { actual: crossings.map(captionText), expected: value.model.thermalLayers.crossings });
  const temperatures = [ ['Cloud', value.model.config.tempC], ['Middle', value.model.config.midLevelTempC], ['Surface', value.model.config.surfaceTempC] ];
  const temperatureRows = temperatures.map(([level, temperature]) => {
    const signed = temperature === 0 ? '0' : (temperature > 0 ? '+' : '') + Number(temperature.toPrecision(3)).toString();
    return { level, temperature, signed, found: cards.some(card => {
      const text = captionText(card);
      return new RegExp('\\b' + level + '\\b', 'i').test(text) && text.replace(/\s+/g, '').includes(signed + '°C');
    }) };
  });
  check(label + ' rail preserves resolved signed temperatures', temperatureRows.every(row => row.found), { temperatures: temperatureRows, allText });
  const actualRail = cards.filter(card => /\b(?:Cloud|Middle|Surface)\b/i.test(captionText(card)) && /°C/.test(captionText(card)));
  check(label + ' all three thermal rail levels render in the actual scene', actualRail.length >= 3 && value.logicalWidth > 0 && value.logicalHeight >= 220, { width: value.logicalWidth, height: value.logicalHeight, levels: actualRail.map(captionText) });
  const dry = cards.filter(card => /^DRY LAYER\b/.test(captionText(card)));
  check(label + ' dry-layer copy appears for actual virga only', value.model.visualType === 'virga'
    ? dry.length === 1 && captionText(dry[0]) === 'DRY LAYER Drops shrink → invisible vapor' : dry.length === 0, { phase: value.model.visualType, actual: dry.map(captionText) });
  const oroActive = value.model.config.showAirflow && value.model.config.terrain === 'mountains' && value.model.config.wind >= 2 && value.model.config.windDirection !== 'calm';
  const windward = cards.filter(card => /^WINDWARD\b/.test(captionText(card))), leeward = cards.filter(card => /^LEEWARD\b/.test(captionText(card)));
  check(label + ' airflow captions follow actual mountain and wind state', oroActive
    ? windward.length === 1 && captionText(windward[0]) === 'WINDWARD LIFT' && leeward.length === 1 && captionText(leeward[0]) === 'LEEWARD DRYING'
    : windward.length === 0 && leeward.length === 0, { oroActive, windDirection: value.model.config.windDirection, wind: value.model.config.wind, windward: windward.map(captionText), leeward: leeward.map(captionText) });
  check(label + ' lifecycle caption matches actual resolved time and stage', cards.some(card => captionText(card) === value.model.lifecycle.stageLabel.toUpperCase() + ' · T=' + value.model.lifecycle.time), { expected: value.model.lifecycle.stageLabel.toUpperCase() + ' · T=' + value.model.lifecycle.time, allText });
  const w = value.logicalWidth, h = value.logicalHeight, ground = h * .82, cloudBase = h * .39;
  const sign = value.model.config.windDirection === 'west' ? -1 : 1;
  const shift = sign * value.model.config.wind / 40 * w * .08;
  const cloudCenter = oroActive ? w * (sign > 0 ? .56 : .78) + shift * .08 : w * .48 + shift * .18;
  const anchorRows = [];
  function anchorProof(card, x, y, family) {
    if (!card) { anchorRows.push({ family, passed: false, missing: true }); return; }
    const near = (a, b) => Math.abs(a - b) < .0001;
    const bounds = card.bounds, connectorX = Math.max(bounds.x, Math.min(bounds.right, x));
    const connectorY = Math.max(bounds.y, Math.min(bounds.bottom, y));
    const needsLeader = Math.abs(connectorX - x) + Math.abs(connectorY - y) > 5;
    const leader = card.leader;
    const passed = needsLeader ? !!leader && near(leader.anchor.x, x) && near(leader.anchor.y, y)
      && near(leader.connector.x, connectorX) && near(leader.connector.y, connectorY) : !leader;
    anchorRows.push({ family, expected: { x, y }, needsLeader, leader, passed });
  }
  for (const [level, y] of [['CLOUD', Math.max(20, cloudBase - 38)], ['MIDDLE', cloudBase + (ground - cloudBase) * .52], ['SURFACE', ground - 15]])
    anchorProof(actualRail.find(card => captionText(card).startsWith(level + ' ')), 10, y, level);
  anchorProof(cloud, cloudCenter, cloudBase, 'cloud-formation');
  value.model.thermalLayers.crossings.forEach((crossing, i) => anchorProof(crossings[i], w - 5, cloudBase + crossing.progress * (ground - cloudBase), 'crossing-' + i));
  if (dry.length) {
    const dryness = 1 - value.model.config.lowLevelHumidity / 100, fall = h * (.68 - dryness * .2);
    anchorProof(dry[0], w - 5, cloudBase + (fall - cloudBase) * Math.max(.3, .48 - dryness * .14), 'virga-dry-layer');
  }
  if (oroActive) {
    anchorProof(windward[0], w * .66 - sign * 34, ground - h * .36 + 16, 'windward');
    anchorProof(leeward[0], w * .66 + sign * 48, ground - h * .36 + 24, 'leeward');
  }
  check(label + ' leaders retain actual semantic scene anchors', anchorRows.every(row => row.passed), anchorRows);
}
async function capture(fixture, value) {
  const filename = prefix + '-' + fixture.id + '.png';
  await page.locator('#wcPrecipCanvas').screenshot({ path: path.join(OUT, filename), animations: 'disabled', timeout: 60000 });
  const bytes = fs.readFileSync(path.join(OUT, filename));
  report.captures.push({ path: filename, sha256: sha(bytes), bytes: bytes.length, width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20), sourceSha256: report.sourceSha256, fixture, cloudPhase: value.model.cloudPhase,
    phase: value.model.visualType, capturedAt: new Date().toISOString() });
  save();
}
(async () => {
  try {
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' });
    page.setDefaultTimeout(45000);
    page.on('pageerror', error => { report.errors.push(String(error)); save(); });
    page.on('console', message => { if (message.type() === 'error') { report.consoleErrors.push(message.text()); save(); } });
    await page.setContent('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Storm caption owned QA</title></head><body style="margin:0;font-family:system-ui;background:#e8eef1"><main id="slot" style="padding:12px;box-sizing:border-box"></main></body></html>');
    await page.addStyleTag({ content: read('dev-tools/.cache/sweep-tailwind.css').toString('utf8') });
    for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'stem_lab/stem_lab_module.js']) await page.addScriptTag({ content: read(file).toString('utf8') });
    await page.evaluate(() => {
      window.stormCaptionPaint = { cards: [], texts: [], frame: 0 };
      const proto = CanvasRenderingContext2D.prototype;
      const native = Object.fromEntries(['beginPath', 'moveTo', 'lineTo', 'quadraticCurveTo', 'bezierCurveTo', 'roundRect', 'closePath', 'fill', 'stroke', 'fillRect', 'fillText'].filter(name => typeof proto[name] === 'function').map(name => [name, proto[name]]));
      const captionCall = () => /drawPrecipCaption2d/.test(new Error().stack || '');
      const mine = ctx => ctx.canvas.id === 'wcPrecipCanvas';
      const point = (ctx, x, y) => { if (ctx._stormCaptionPath) ctx._stormCaptionPath.points.push({ x, y }); };
      proto.beginPath = function (...args) { if (mine(this)) this._stormCaptionPath = captionCall() ? { points: [], rounded: false, closed: false } : null; return native.beginPath.apply(this, args); };
      for (const name of ['moveTo', 'lineTo', 'quadraticCurveTo', 'bezierCurveTo']) proto[name] = function (...args) {
        if (mine(this) && this._stormCaptionPath) { for (let i = 0; i < args.length; i += 2) point(this, args[i], args[i + 1]); if (name.includes('Curve')) this._stormCaptionPath.rounded = true; }
        return native[name].apply(this, args);
      };
      if (native.roundRect) proto.roundRect = function (x, y, width, height, ...rest) {
        if (mine(this) && this._stormCaptionPath) { point(this, x, y); point(this, x + width, y + height); this._stormCaptionPath.rounded = true; }
        return native.roundRect.call(this, x, y, width, height, ...rest);
      };
      proto.closePath = function (...args) { if (mine(this) && this._stormCaptionPath) this._stormCaptionPath.closed = true; return native.closePath.apply(this, args); };
      proto.fill = function (...args) {
        if (mine(this) && this._stormCaptionPath && captionCall()) {
          const points = this._stormCaptionPath.points;
          if (points.length) {
            const x = Math.min(...points.map(point => point.x)), y = Math.min(...points.map(point => point.y));
            const right = Math.max(...points.map(point => point.x)), bottom = Math.max(...points.map(point => point.y));
            if (right - x >= 40 && bottom - y >= 20) {
              stormCaptionPaint.cards.push({ bounds: { x, y, width: right - x, height: bottom - y, right, bottom }, rounded: this._stormCaptionPath.rounded, fill: this.fillStyle, alpha: this.globalAlpha, leader: this._stormCaptionPendingLeader || null, texts: [] });
              this._stormCaptionPendingLeader = null;
            }
          }
        }
        return native.fill.apply(this, args);
      };
      proto.stroke = function (...args) {
        if (mine(this) && this._stormCaptionPath?.points.length === 2 && captionCall()) {
          const [anchor, connector] = this._stormCaptionPath.points;
          this._stormCaptionPendingLeader = { anchor, connector, stroke: this.strokeStyle, width: this.lineWidth };
        }
        return native.stroke.apply(this, args);
      };
      proto.fillRect = function (x, y, width, height) {
        if (mine(this) && x === 0 && y === 0 && height >= this.canvas.getBoundingClientRect().height - .5 && width >= this.canvas.getBoundingClientRect().width - .5) {
          window.stormCaptionPaint = { cards: [], texts: [], frame: stormCaptionPaint.frame + 1 };
          this._stormCaptionPendingLeader = null;
        }
        return native.fillRect.call(this, x, y, width, height);
      };
      proto.fillText = function (text, x, y, ...rest) {
        if (mine(this)) {
          const metrics = this.measureText(text), fontSize = Number((this.font.match(/([\d.]+)px/) || [])[1]);
          const item = { text: String(text), x, y, font: this.font, fontSize, fill: this.fillStyle,
            argumentCount: 3 + rest.length, align: this.textAlign, baseline: this.textBaseline,
            measuredWidth: metrics.width, bounds: { x: x - metrics.actualBoundingBoxLeft, y: y - metrics.actualBoundingBoxAscent,
              right: x + metrics.actualBoundingBoxRight, bottom: y + metrics.actualBoundingBoxDescent } };
          stormCaptionPaint.texts.push(item);
          if (captionCall() && stormCaptionPaint.cards.length) stormCaptionPaint.cards[stormCaptionPaint.cards.length - 1].texts.push(item);
        }
        return native.fillText.call(this, text, x, y, ...rest);
      };
    });
    await page.addScriptTag({ content: source.toString('utf8') });
    await page.evaluate(() => {
      const Icons = new Proxy({}, { get: () => () => React.createElement('span', { 'aria-hidden': true }) });
      window.stormCaptionAwards = [];
      window.mountStormCaption = function (seed, variant) {
        function Host() {
          const [state, setState] = React.useState({ waterCycle: seed });
          window.stormCaptionData = state.waterCycle;
          window.stormCaptionSet = setState;
          const noop = () => {};
          return StemLab._registry.waterCycle.render({ React, toolData: state, setToolData: setState,
            isDark: !!variant.dark, isContrast: !!variant.contrast, gradeBand: '6-8', gradeLevel: '7th Grade', icons: Icons,
            setStemLabTool: noop, setStemLabTab: noop, setToolSnapshots: noop, toolSnapshots: [], addToast: noop,
            announceToSR: noop, awardXP: (...args) => stormCaptionAwards.push(args), getXP: () => 0, beep: noop,
            celebrate: noop, canvasNarrate: noop, canvasA11yDesc: noop, a11yClick: f => ({ onClick: f }),
            t: (key, fallback) => fallback == null ? key : fallback, props: {}, srOnly: {}, callGemini: null });
        }
        document.documentElement.classList.toggle('dark', !!variant.dark);
        document.body.style.background = variant.dark ? '#081b21' : '#e8eef1';
        const slot = document.getElementById('slot');
        slot.style.width = variant.host ? variant.host + 'px' : '';
        ReactDOM.unmountComponentAtNode(slot);
        ReactDOM.render(React.createElement(Host), slot);
      };
    });
    for (const fixture of cases) {
      await mount(fixture);
      const before = await snapshot();
      const value = await evidence();
      report.cases.push({ fixture, before, paint: value });
      if (fixture.phase) check(fixture.id + ' intended surface phase matches actual kernel', value.model.visualType === fixture.phase, { expected: fixture.phase, actual: value.model.visualType });
      check(fixture.id + ' scene dataset matches actual surface phase', before.dataset.precipitationType === value.model.visualType, before.dataset);
      check(fixture.id + ' scene has no horizontal page overflow', !value.pageOverflow, { width: value.logicalWidth, height: value.logicalHeight });
      if (!baseline) captionChecks(fixture.id, value);
      await capture(fixture, value);
      await page.waitForTimeout(150);
      const after = await snapshot();
      report.cases[report.cases.length - 1].after = after;
      check(fixture.id + ' passive capture preserves full learner state and awards', same(before.data, after.data) && same(before.awards, after.awards), { beforeDataSha256: sha(JSON.stringify(stable(before.data))), afterDataSha256: sha(JSON.stringify(stable(after.data))), awardsBefore: before.awards, awardsAfter: after.awards });
      check(fixture.id + ' paused canvas pixels stay still', before.canvasSha256 === after.canvasSha256, { before: before.canvasSha256, after: after.canvasSha256 });
      check(fixture.id + ' native canvas/context and function hooks retained', after.engine.canvas && after.engine.context && after.engine.sync && after.engine.cleanup && after.engine.syncType === 'function' && after.engine.cleanupType === 'function', after.engine);
    }
    const windFixture = { id: 'native-wind-select', preset: 'mountainSnow', width: 390 };
    await mount(windFixture);
    const before = await snapshot();
    await page.selectOption('#wcPrecipWindDirection', 'west');
    await painted();
    const after = await snapshot(), value = await evidence();
    report.nativeActions.push({ label: 'Original native wind-direction select', before, after, paint: value });
    const untouched = value => { const copy = JSON.parse(JSON.stringify(value)); delete copy.precipHunt; return copy; };
    check('Native wind select changes actual wind direction', after.data.precipHunt.windDirection === 'west' && value.model.config.windDirection === 'west' && after.dataset.precipitationWindDirection === 'west', { input: after.data.precipHunt.windDirection, model: value.model.config.windDirection, dataset: after.dataset.precipitationWindDirection });
    check('Native wind select retains other learner data and awards', same(untouched(before.data), untouched(after.data)) && same(before.awards, after.awards) && same(before.data.precipHunt.experiment, after.data.precipHunt.experiment), { before: untouched(before.data), after: untouched(after.data), awards: after.awards });
    check('Native wind select retains actual canvas and function hooks', after.engine.canvas && after.engine.context && after.engine.sync && after.engine.cleanup, after.engine);
    if (!baseline) captionChecks('native-wind-select', value);
    await capture(windFixture, value);
    check('No runtime or console errors', report.consoleErrors.length === 0 && report.errors.length === 0, { consoleErrors: report.consoleErrors });
    check('Tested source retained', sha(read(sourcePath)) === report.sourceSha256);
    if (!baseline) check('Candidate source/public mirror identical', sha(read('desktop/web-app/public/stem_lab/stem_tool_watercycle.js')) === report.sourceSha256);
    report.completed = true;
    report.successful = report.errors.length === 0;
  } catch (error) {
    report.errors.push(error.stack || String(error));
  } finally {
    if (browser) { await browser.close(); report.browserClosed = true; report.browserClosedAt = new Date().toISOString(); }
    report.resourcesClosed = true;
    report.completedAt = new Date().toISOString();
    save(true);
    console.log(JSON.stringify({ mode, run, pid: report.pid, completed: report.completed, successful: report.successful,
      checks: report.checks.length, captures: report.captures.length, errors: report.errors, browserClosed: report.browserClosed }));
    if (!report.successful) process.exitCode = 1;
  }
})();
