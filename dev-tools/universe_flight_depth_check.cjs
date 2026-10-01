const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const repo = process.env.UNIVERSE_REPO || path.resolve(__dirname, '..');
const report = process.env.UNIVERSE_DEPTH_REPORT || path.join(repo, 'reports/universe-flight-2026-09-29');
const baselineFile = process.env.UNIVERSE_DEPTH_BASELINE_SOURCE || path.join(report, 'depth-baseline-renderer.js');
const phase = process.argv[2] || 'refined';
assert.ok(['baseline', 'refined'].includes(phase));
const { chromium } = require(path.join(repo, 'node_modules/playwright'));
const source = fs.readFileSync(phase === 'baseline' ? baselineFile : path.join(repo, 'stem_lab/universe_flight_scene.js'), 'utf8');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
fs.mkdirSync(report, { recursive: true });
const result = { phase, sourceHash: hash(source), completed: false, interceptions: 0, checks: [], captures: [], errors: [], graphics: [], stability: [], regions: {}, comparison: [] };
const save = () => fs.writeFileSync(path.join(report, `depth-${phase}.json`), JSON.stringify(result, null, 2));

function decode(buffer) {
  assert.equal(buffer.subarray(1, 4).toString(), 'PNG');
  let width, height, channels, offset = 8;
  const parts = [];
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset), type = buffer.subarray(offset + 4, offset + 8).toString(), data = buffer.subarray(offset + 8, offset + 8 + length);
    offset += length + 12;
    if (type === 'IHDR') { width = data.readUInt32BE(0); height = data.readUInt32BE(4); assert.equal(data[8], 8); assert.ok([2, 6].includes(data[9])); channels = data[9] === 6 ? 4 : 3; }
    else if (type === 'IDAT') parts.push(data);
    else if (type === 'IEND') break;
  }
  const raw = zlib.inflateSync(Buffer.concat(parts)), stride = width * channels, pixels = Buffer.alloc(stride * height);
  const paeth = (a, b, c) => { const p = a + b - c, aa = Math.abs(p - a), bb = Math.abs(p - b), cc = Math.abs(p - c); return aa <= bb && aa <= cc ? a : bb <= cc ? b : c; };
  for (let y = 0; y < height; y++) for (let x = 0; x < stride; x++) {
    const i = y * stride + x, f = raw[y * (stride + 1)], a = x >= channels ? pixels[i - channels] : 0, b = y ? pixels[i - stride] : 0, c = y && x >= channels ? pixels[i - stride - channels] : 0;
    assert.ok(f <= 4);
    pixels[i] = (raw[y * (stride + 1) + 1 + x] + (f === 0 ? 0 : f === 1 ? a : f === 2 ? b : f === 3 ? (a + b) >> 1 : paeth(a, b, c))) & 255;
  }
  return { width, height, channels, pixels };
}
function stats(image, box = [0, 0, 1, 1]) {
  const x0 = Math.floor(box[0] * image.width), y0 = Math.floor(box[1] * image.height), x1 = Math.ceil(box[2] * image.width), y1 = Math.ceil(box[3] * image.height);
  let count = 0, sum = 0, square = 0, clipped = 0, colored = 0, edge = 0, edges = 0, max = 0;
  const level = (x, y) => { const i = (y * image.width + x) * image.channels; return .2126 * image.pixels[i] + .7152 * image.pixels[i + 1] + .0722 * image.pixels[i + 2]; };
  for (let y = y0; y < y1; y += 2) for (let x = x0; x < x1; x += 2) {
    const i = (y * image.width + x) * image.channels, values = [image.pixels[i], image.pixels[i + 1], image.pixels[i + 2]], l = level(x, y);
    count++; sum += l; square += l * l; max = Math.max(max, ...values);
    if (Math.min(...values) >= 250) clipped++;
    if (Math.max(...values) - Math.min(...values) > 8) colored++;
    if (x + 2 < x1) { edge += Math.abs(l - level(x + 2, y)); edges++; }
    if (y + 2 < y1) { edge += Math.abs(l - level(x, y + 2)); edges++; }
  }
  return { mean: sum / count, luminanceStd: Math.sqrt(Math.max(0, square / count - (sum / count) ** 2)), adjacentContrast: edge / edges, clippedWhiteFraction: clipped / count, colorFraction: colored / count, max };
}
function difference(a, b) {
  assert.equal(a.width, b.width); assert.equal(a.height, b.height);
  let sum = 0, changed = 0, count = 0;
  for (let y = 0; y < a.height; y += 2) for (let x = 0; x < a.width; x += 2) {
    const ai = (y * a.width + x) * a.channels, bi = (y * b.width + x) * b.channels;
    const d = (Math.abs(a.pixels[ai] - b.pixels[bi]) + Math.abs(a.pixels[ai + 1] - b.pixels[bi + 1]) + Math.abs(a.pixels[ai + 2] - b.pixels[bi + 2])) / 3;
    count++; sum += d; if (d > 4) changed++;
  }
  return { meanAbsolute: sum / count, changedFraction: changed / count };
}
function world([x, y, z]) {
  const ty = y * Math.cos(.88) - z * Math.sin(.88), tz = y * Math.sin(.88) + z * Math.cos(.88);
  return [x * Math.cos(-.22) - ty * Math.sin(-.22), x * Math.sin(-.22) + ty * Math.cos(-.22), tz];
}
const cluster = world([23000, -13000, -18000]);
const radial = cluster.map(v => v / Math.hypot(...cluster));
const presetPosition = [25751.1723, 463.6085, -22166.3513];
const views = [
  { name: 'galaxy-portrait', position: [0, 0, -95000], aim: [0, 0, 0], fov: 65 },
  { name: 'galaxy-arrival', position: [0, 5442, -17135], aim: [0, 0, 0], fov: 65 },
  { name: 'galaxy-edge-on', position: world([0, 900, -70000]), aim: [0, 0, 0], fov: 65 },
  { name: 'galaxy-arm-interior', position: [-20170, 10020, -7910], aim: [0, 0, 0], fov: 75 },
  { name: 'galaxy-outer-disk', position: [48795, -10911, -5500], aim: [0, 0, 0], fov: 75 },
  { name: 'cluster-outward', position: presetPosition, aim: cluster, fov: 50 },
  { name: 'cluster-inward', position: cluster.map((v, i) => 2 * v - presetPosition[i]), aim: cluster, fov: 50 },
  { name: 'cluster-side', position: presetPosition.map((v, i) => v + (i === 0 ? 700 : 0)), aim: cluster, fov: 50 }
];

(async () => {
  save();
  const browser = await chromium.launch({ args: ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.on('pageerror', error => result.errors.push(String(error)));
    if (phase === 'baseline') await page.route(/universe_flight_scene\.js(?:\?.*)?$/, async route => { result.interceptions++; await route.fulfill({ contentType: 'application/javascript', body: source }); });
    await page.addInitScript(() => {
      window.__depthGL = []; window.__depthScenes = [];
      const context = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) {
        const gl = context.call(this, type, ...args); if (type !== 'webgl' || !gl || gl.__depthProbe) return gl;
        gl.__depthProbe = true;
        const record = { created: 0, deleted: 0, textures: [], shaders: [], points: null };
        window.__depthGL.push({ gl, record });
        const data = gl.bufferData.bind(gl), shader = gl.shaderSource.bind(gl), create = gl.createTexture.bind(gl), remove = gl.deleteTexture.bind(gl);
        gl.bufferData = function (target, values, ...rest) { if (values instanceof Float32Array && values.length > 9000 && values.length % 9 === 0) record.points = Array.from(new Uint8Array(values.buffer, values.byteOffset, values.byteLength)); return data(target, values, ...rest); };
        gl.shaderSource = function (object, text) { record.shaders.push(text); return shader(object, text); };
        gl.createTexture = function () { const texture = create(); record.created++; record.textures.push(texture); return texture; };
        gl.deleteTexture = function (texture) { if (texture) record.deleted++; return remove(texture); };
        return gl;
      };
      let api;
      Object.defineProperty(window, 'UniverseFlight', { configurable: true, get() { return api; }, set(value) {
        const create = value.create;
        value.create = function (canvas, options) {
          const telemetry = options.onTelemetry, status = options.onStatus;
          const scene = create.call(this, canvas, Object.assign({}, options, { onTelemetry(info) { window.__depthInfo = info; if (telemetry) telemetry(info); }, onStatus(info) { window.__depthStatus = info; if (status) status(info); } }));
          window.__depthScene = scene; window.__depthCanvas = canvas; window.__depthScenes.push(scene); return scene;
        }; api = value;
      } });
    });
    await page.goto(process.env.UNIVERSE_DEPTH_URL || 'http://127.0.0.1:3187/reports/universe-flight-2026-09-29/preview.html?depth=qa');
    await page.waitForFunction(() => window.__depthScene && window.__depthStatus?.state === 'ready');
    if (phase === 'baseline') assert.ok(result.interceptions > 0);
    await page.getByRole('button', { name: 'Toggle full screen for the 3D view', exact: true }).click();
    await page.waitForFunction(() => !!document.fullscreenElement);
    const next = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    async function pose(view, { region = 'galaxy', quality = 'auto', exposure = 1 } = {}) {
      await page.evaluate(({ view, region, quality, exposure }) => {
        const scene = window.__depthScene, saved = scene.snapshot(), delta = view.aim.map((v, i) => v - view.position[i]);
        Object.assign(saved.settings, { region, mode: 'explore', fov: view.fov, quality, exposure });
        Object.assign(saved.state, { position: view.position, yaw: Math.atan2(delta[0], delta[2]), pitch: Math.asin(delta[1] / Math.hypot(...delta)), distanceLy: 0, universeYears: 0, travelerYears: 0 });
        saved.targetId = null; if (!scene.restore(saved)) throw new Error('Depth viewpoint rejected: ' + view.name); scene.set({ running: false });
      }, { view, region, quality, exposure });
      await next();
    }
    async function capture(name) {
      const snapshot = await page.evaluate(() => window.__depthScene.capture());
      assert.ok(snapshot?.dataUrl.startsWith('data:image/png;base64,'));
      const buffer = Buffer.from(snapshot.dataUrl.split(',')[1], 'base64'), image = decode(buffer), full = stats(image), center = stats(image, [.30, .25, .70, .75]);
      assert.ok(full.max > 32);
      fs.writeFileSync(path.join(report, `depth-${phase}-${name}.png`), buffer);
      const errors = await page.evaluate(() => window.__depthGL.map(({ gl }) => gl.getError())); assert.ok(errors.every(code => code === 0));
      result.graphics.push({ name, errors }); result.captures.push({ name, width: image.width, height: image.height, pixelHash: hash(image.pixels), snapshot: snapshot.snapshot, full, center }); save(); return image;
    }
    async function points(region) {
      const bytes = Buffer.from(await page.evaluate(() => window.__depthGL.at(-1).record.points));
      assert.ok(bytes.length > 0 && bytes.length % 36 === 0);
      result.regions[region] = { count: bytes.length / 36, hash: hash(bytes) };
      if (region === 'galaxy') {
        assert.equal(bytes.length / 36, 36400);
        result.regions.galaxy.spiralHash = hash(bytes.subarray(0, 30000 * 36));
        result.regions.galaxy.backgroundHash = hash(bytes.subarray(35000 * 36));
      }
      return bytes;
    }
    await pose({ name: 'neighborhood-data', position: [0, 0, 0], aim: [0, 0, 34], fov: 75 }, { region: 'neighborhood' }); await points('neighborhood');
    await pose(views[0]); const galaxyBytes = await points('galaxy');
    fs.writeFileSync(path.join(report, `depth-${phase}-points.bin`), galaxyBytes);
    await checkPreset();
    for (const view of views) {
      await pose(view); const image = await capture(view.name);
      if (['galaxy-arrival', 'cluster-outward'].includes(view.name)) {
        const frozen = await page.evaluate(() => window.__depthScene.snapshot()); await page.waitForTimeout(180);
        const repeated = await page.evaluate(() => window.__depthScene.capture());
        assert.deepEqual(decode(Buffer.from(repeated.dataUrl.split(',')[1], 'base64')).pixels, image.pixels);
        assert.deepEqual(repeated.snapshot, frozen); result.stability.push({ name: view.name, identicalPixels: true });
      }
      result.checks.push(view.name + ' renders a paused world-space view');
    }
    const front = decode(fs.readFileSync(path.join(report, `depth-${phase}-cluster-outward.png`))), side = decode(fs.readFileSync(path.join(report, `depth-${phase}-cluster-side.png`)));
    result.parallax = difference(front, side); assert.ok(result.parallax.changedFraction > .001);
    await pose(views[1], { quality: 'low', exposure: 2 }); await capture('galaxy-low-exposure2'); result.checks.push('low resolution and high exposure retain valid galaxy drawing');
    await pose({ name: 'cosmic-data', position: [0, 0, -2200000], aim: [0, 0, 0], fov: 60 }, { region: 'cosmic' }); await points('cosmic');
    result.shaderHash = hash(JSON.stringify(await page.evaluate(() => window.__depthGL.at(-1).record.shaders)));
    result.math = await page.evaluate(() => ({ gamma: UniverseFlight.math.gamma(.99), aberrate: UniverseFlight.math.aberrate([.4, -.2, .7], .99), spectrum: UniverseFlight.math.viewSpectrum(.99, .3, -.2, 550), clock: UniverseFlight.math.lightClock(.99, 1) }));
    await pose(views[0]);
    await page.evaluate(() => { window.__depthScene.set({ speed: 1e6 }); if (!window.__depthScene.navigateTo('galactic-center', 1)) throw new Error('Galaxy navigation rejected'); });
    await page.waitForFunction(() => window.__depthInfo?.navigation?.completed && window.__depthInfo.running === false, {}, { timeout: 30000 });
    await capture('actual-arrival');
    const arrived = await page.evaluate(() => window.__depthScene.snapshot()); result.navigation = { arrivalRadiusLy: Math.hypot(...arrived.state.position), snapshot: arrived };
    assert.ok(Math.abs(result.navigation.arrivalRadiusLy - 18000) < 1e-7);
    await page.evaluate(() => { if (!window.__depthScene.startOrbit('galactic-center')) throw new Error('Galaxy orbit rejected'); });
    await page.waitForFunction(p => Math.hypot(...window.__depthScene.snapshot().state.position.map((v, i) => v - p[i])) > 100, arrived.state.position);
    await page.evaluate(() => window.__depthScene.set({ running: false })); await capture('actual-orbit-paused');
    const orbited = await page.evaluate(() => window.__depthScene.snapshot()); result.navigation.orbitRadiusLy = Math.hypot(...orbited.state.position); assert.ok(Math.abs(result.navigation.orbitRadiusLy - 18000) < 1e-7); result.checks.push('genuine galactic-center approach and orbit preserve their viewing radius');
    if (phase === 'refined') {
      const baseline = JSON.parse(fs.readFileSync(path.join(report, 'depth-baseline.json'), 'utf8')); assert.equal(baseline.completed, true);
      assert.equal(result.regions.neighborhood.hash, baseline.regions.neighborhood.hash); assert.equal(result.regions.cosmic.hash, baseline.regions.cosmic.hash);
      assert.equal(result.regions.galaxy.spiralHash, baseline.regions.galaxy.spiralHash); assert.equal(result.regions.galaxy.backgroundHash, baseline.regions.galaxy.backgroundHash);
      assert.equal(result.shaderHash, baseline.shaderHash); assert.deepEqual(result.math, baseline.math);
      for (const item of result.captures) {
        if (item.name === 'actual-orbit-paused') continue;
        const old = baseline.captures.find(value => value.name === item.name); if (!old) continue;
        result.comparison.push({ name: item.name, difference: difference(decode(fs.readFileSync(path.join(report, `depth-baseline-${item.name}.png`))), decode(fs.readFileSync(path.join(report, `depth-refined-${item.name}.png`)))), before: old.center, after: item.center });
      }
      result.checks.push('other regions, spiral emission, background stars, shaders, and relativity stay identical');
    }
    result.checks.push('the galaxy retains exactly 36400 points');
    result.checks.push('separate cluster camera positions produce visible parallax');
    async function checkPreset() {
    await pose(views[5]); const original = await capture('reopen-reference');
    await page.getByRole('button', { name: 'Toggle full screen for the 3D view', exact: true }).click(); await page.waitForFunction(() => !document.fullscreenElement);
    await page.getByRole('button', { name: 'Close flight explorer', exact: true }).click(); await page.waitForFunction(() => !document.querySelector('.uf-stage'));
    result.disposal = await page.evaluate(() => window.__depthGL.map(({ gl, record }) => ({ created: record.created, deleted: record.deleted, live: record.textures.filter(t => gl.isTexture(t)).length })));
    assert.ok(result.disposal.every(r => r.created === r.deleted && r.live === 0));
    await page.getByRole('button', { name: 'Open 3D flight', exact: true }).click(); await page.waitForFunction(() => window.__depthScenes.length === 2 && window.__depthStatus?.state === 'ready');
    await page.getByRole('button', { name: 'Toggle full screen for the 3D view', exact: true }).click(); await page.waitForFunction(() => !!document.fullscreenElement);
    await pose(views[5]); const reopened = await capture('reopened'); assert.deepEqual(reopened.pixels, original.pixels); result.checks.push('textures release and reopen without changing paused cluster pixels');
    await page.getByRole('button', { name: 'Toggle full screen for the 3D view', exact: true }).click(); await page.waitForFunction(() => !document.fullscreenElement);
    await page.locator('#uf-region').selectOption('galaxy');
    await page.evaluate(() => { const saved = window.__depthScene.snapshot(); saved.state.distanceLy = 123; saved.state.universeYears = 45; saved.state.travelerYears = 12; window.__depthScene.restore(saved); window.__depthScene.set({ running: true }); });
    await page.locator('.uf-vista-list').getByRole('button', { name: /Halo star cluster/ }).click(); await next();
    const preset = await page.evaluate(() => window.__depthScene.snapshot());
    assert.equal(preset.settings.region, 'galaxy'); assert.equal(preset.settings.mode, 'explore'); assert.equal(preset.settings.fov, 50); assert.equal(preset.settings.exposure, 1); assert.equal(preset.targetId, null);
    assert.ok(preset.state.position.every((v, i) => Math.abs(v - presetPosition[i]) < .0001));
    assert.equal(preset.state.distanceLy, 0); assert.equal(preset.state.universeYears, 0); assert.equal(preset.state.travelerYears, 0); assert.equal(await page.evaluate(() => window.__depthInfo.running), false);
    const delta = cluster.map((v, i) => v - preset.state.position[i]), yawDifference = preset.state.yaw - Math.atan2(delta[0], delta[2]); assert.ok(Math.abs(Math.atan2(Math.sin(yawDifference), Math.cos(yawDifference))) < 1e-6); assert.ok(Math.abs(preset.state.pitch - Math.asin(delta[1] / Math.hypot(...delta))) < 1e-6);
    await page.getByRole('button', { name: 'Toggle full screen for the 3D view', exact: true }).click(); await page.waitForFunction(() => !!document.fullscreenElement);
    const normalPreset = await capture('ui-halo-preset');
    await page.locator('#uf-flight-controls-toggle').click(); await page.locator('#uf-inview-tab-explore').click(); await page.locator('#uf-inview-vista').selectOption('3'); await next();
    const fullscreenPreset = await page.evaluate(() => window.__depthScene.snapshot()); assert.deepEqual(fullscreenPreset, preset);
    const fullscreenImage = await capture('ui-halo-fullscreen'); assert.deepEqual(fullscreenImage.pixels, normalPreset.pixels);
    assert.equal(await page.evaluate(() => document.activeElement === window.__depthCanvas), true);
    await page.evaluate(saved => { const other = structuredClone(saved); other.state.position[0] += 1000; other.settings.fov = 70; if (!window.__depthScene.restore(other) || !window.__depthScene.restore(saved)) throw new Error('Cluster snapshot restore rejected'); }, preset);
    assert.deepEqual(await page.evaluate(() => window.__depthScene.snapshot()), preset); result.preset = preset; result.checks.push('normal and fullscreen halo presets pause, reset, aim, focus, and restore the identical scene');
    }
    assert.deepEqual(result.errors, []); result.completed = true; save();
    console.log(`Depth ${phase} passed: ${result.checks.length} groups, ${result.captures.length} captures; source ${result.sourceHash}.`);
  } catch (error) { result.failure = String(error); save(); throw error; } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
