'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict'), zlib = require('node:zlib');
const repo = path.resolve(__dirname, '..'), report = process.env.UNIVERSE_ANGLE_DETAIL_REPORT || path.join(repo, 'reports/universe-flight-2026-09-29/angle-detail');
const stage = process.env.UNIVERSE_ANGLE_DETAIL_STAGE || report;
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const sources = { baseline: fs.readFileSync(path.join(stage, 'baseline-renderer.js'), 'utf8'), refined: fs.readFileSync(process.env.UNIVERSE_ANGLE_DETAIL_SOURCE || path.join(repo, 'stem_lab/universe_flight_scene.js'), 'utf8') };
assert.equal(hash(sources.baseline), '1bc026596a0244f335a5ef69bdcc1d2fc4aa1d5b1f17033cad72eadb307e1f21');
fs.mkdirSync(report, { recursive: true });
const result = { completed: false, baselineHash: hash(sources.baseline), rendererHash: hash(sources.refined), harnessHash: hash(fs.readFileSync(__filename)), checks: [], captures: [], comparisons: [], resources: [], errors: [], geometry: [] };
const save = () => fs.writeFileSync(path.join(report, 'native-check.json'), JSON.stringify(result, null, 2) + '\n');
const check = name => { result.checks.push(name); save(); console.log('Passed ' + name); };
function png(bytes) {
  assert.deepEqual(bytes.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  let width, height, channels, offset = 8; const chunks = [];
  while (offset < bytes.length) { const length = bytes.readUInt32BE(offset), type = bytes.subarray(offset + 4, offset + 8).toString(), data = bytes.subarray(offset + 8, offset + 8 + length); offset += length + 12;
    if (type === 'IHDR') { width = data.readUInt32BE(0); height = data.readUInt32BE(4); assert.equal(data[8], 8); assert.ok([2, 6].includes(data[9])); channels = data[9] === 6 ? 4 : 3; } else if (type === 'IDAT') chunks.push(data); else if (type === 'IEND') break;
  }
  const raw = zlib.inflateSync(Buffer.concat(chunks)), stride = width * channels, pixels = Buffer.alloc(stride * height);
  const paeth = (a, b, c) => { const p = a + b - c, aa = Math.abs(p - a), bb = Math.abs(p - b), cc = Math.abs(p - c); return aa <= bb && aa <= cc ? a : bb <= cc ? b : c; };
  for (let y = 0; y < height; y++) for (let x = 0; x < stride; x++) { const i = y * stride + x, f = raw[y * (stride + 1)], a = x >= channels ? pixels[i - channels] : 0, b = y ? pixels[i - stride] : 0, c = y && x >= channels ? pixels[i - stride - channels] : 0; assert.ok(f <= 4); pixels[i] = (raw[y * (stride + 1) + 1 + x] + (f === 0 ? 0 : f === 1 ? a : f === 2 ? b : f === 3 ? (a + b) >> 1 : paeth(a, b, c))) & 255; }
  return { width, height, channels, pixels };
}
function stats(bytes) {
  const image = png(bytes), light = (x, y) => { const i = (y * image.width + x) * image.channels; return .2126 * image.pixels[i] + .7152 * image.pixels[i + 1] + .0722 * image.pixels[i + 2]; };
  let sum = 0, clipped = 0, gradient = 0, visible = 0, annulusGradient = 0;
  for (let y = 0; y < image.height; y++) for (let x = 0; x < image.width; x++) {
    const i = (y * image.width + x) * image.channels, value = light(x, y); sum += value;
    if (Math.min(image.pixels[i], image.pixels[i + 1], image.pixels[i + 2]) >= 250) clipped++;
    if (value > 8) visible++;
    if (x && y) { const energy = (value - light(x - 1, y)) ** 2 + (value - light(x, y - 1)) ** 2; gradient += energy; if (Math.hypot((x - image.width / 2) / image.width, (y - image.height / 2) / image.height) > .065 && value > 4) annulusGradient += energy; }
  }
  return { width: image.width, height: image.height, meanLuminance: sum / (image.width * image.height), clippedWhiteFraction: clipped / (image.width * image.height), visiblePixels: visible, gradientEnergy: gradient, armGradientEnergy: annulusGradient };
}
function difference(a, b) {
  const left = png(a), right = png(b); assert.deepEqual([left.width, left.height, left.channels], [right.width, right.height, right.channels]); let sum = 0, changed = 0, maximum = 0;
  for (let i = 0; i < left.pixels.length; i += left.channels) { let delta = 0; for (let c = 0; c < 3; c++) { const d = Math.abs(left.pixels[i + c] - right.pixels[i + c]); delta += d; sum += d; maximum = Math.max(maximum, d); } if (delta > 6) changed++; }
  return { meanAbsolute: sum / (left.width * left.height * 3), changedPixels: changed, maximumChannelDifference: maximum };
}
const models = { spiral: { center: [0, 0, 0], radius: 52000, tilt: .88, turn: -.22, region: 'galaxy', index: 0 }, twoarm: { center: [-480000, 190000, 1300000], radius: 100000, tilt: 1.05, turn: .45, region: 'cosmic', index: 1 }, barred: { center: [2100000, -800000, 4200000], radius: 90000, tilt: .7, turn: -.2, region: 'cosmic', index: 2 }, elliptical: { center: [800000, 550000, 850000], radius: 135000, tilt: 1.05, turn: -.55, region: 'cosmic', index: 3 } };
function view(model, name, direction, extra = {}) {
  const m = models[model], ct = Math.cos(m.tilt), st = Math.sin(m.tilt), cr = Math.cos(m.turn), sr = Math.sin(m.turn), ty = direction[1] * ct - direction[2] * st, tz = direction[1] * st + direction[2] * ct, d = [direction[0] * cr - ty * sr, direction[0] * sr + ty * cr, tz], length = Math.hypot(...d), distance = (extra.range || 3) * m.radius;
  return { name: model + '-' + name, position: m.center.map((c, i) => c + d[i] * distance / length), aim: m.center, fov: 50, region: m.region, index: m.index, layer: 'diffuse', ...extra };
}
const views = ['spiral', 'twoarm', 'barred'].flatMap(model => [view(model, 'face', [0, 1, 0]), view(model, 'oblique', [1, .25, .15]), view(model, 'shallow', [1, .10, .2]), view(model, 'grazing', [1, .02, .2])]);
views.push(view('spiral', 'near', [1, .2, .15], { range: .2 }), view('elliptical', 'oblique', [.7, .35, .6]), { name: 'distant-group', position: [0, 5000000, -15000000], aim: [0, 0, 0], fov: 85, region: 'cosmic', layer: 'full' }, view('spiral', 'relativity', [1, .25, .15], { mode: 'relativity', beta: .6 }), { name: 'relativity-forward', position: [0, 0, -156000], aim: [0, 0, 0], fov: 65, region: 'galaxy', mode: 'relativity', beta: .99, layer: 'full' }, { name: 'blue-star', position: [4.35, -2.18, 16.09], aim: [4.3, -2.2, 16], fov: 50, region: 'neighborhood', layer: 'full' }, { name: 'nebula', position: [13, -7, 24], aim: [9, -2, 34], fov: 50, region: 'neighborhood', layer: 'full' }, view('spiral', 'low', [1, .1, .2], { quality: 'low' }));

async function main() {
  const { chromium } = require(path.join(repo, 'node_modules/playwright'));
  const browser = await chromium.launch({ args: ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); const images = new Map(), populations = {}, routes = {}, atlasHashes = {};
  try {
    for (const phase of ['baseline', 'refined', 'fallback', 'capped', 'query-failure', 'write-failure']) {
      console.log('Capturing ' + phase); const page = await browser.newPage({ viewport: { width: 840, height: 560 }, deviceScaleFactor: 1 }); page.setDefaultTimeout(60000); page.on('pageerror', error => result.errors.push(String(error)));
      await page.route('http://127.0.0.1:3187/angle-native', route => route.fulfill({ contentType: 'text/html', body: '<style>body{margin:0;background:#000}canvas{display:block;width:840px;height:560px}</style><canvas></canvas>' })); await page.goto('http://127.0.0.1:3187/angle-native');
      await page.evaluate(phase => {
        window.__phase = phase; window.__layer = 'full'; window.__modelIndex = 0; const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
          const gl = original.call(this, kind, ...args); if (!gl || kind !== 'webgl') return gl;
          const ext = gl.getExtension('EXT_texture_filter_anisotropic'), maximum = ext ? gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT) : 1;
          const r = { gl, extension: ext, maximum, created: { textures: [], buffers: [], programs: [] }, deleted: { textures: 0, buffers: 0, programs: 0 }, texture: null, points: [], atlases: [], sampling: [], queries: [], capabilityQueries: 0, uploads: 0 }; window.__probe = r;
          const digest = data => crypto.subtle.digest('SHA-256', new Uint8Array(data.buffer, data.byteOffset, data.byteLength)).then(bytes => [...new Uint8Array(bytes)].map(v => v.toString(16).padStart(2, '0')).join(''));
          for (const [kind, label] of [['Texture', 'textures'], ['Buffer', 'buffers'], ['Program', 'programs']]) { const create = gl['create' + kind].bind(gl), remove = gl['delete' + kind].bind(gl); gl['create' + kind] = () => { const resource = create(); r.created[label].push(resource); return resource; }; gl['delete' + kind] = resource => { if (resource) r.deleted[label]++; return remove(resource); }; }
          const bind = gl.bindTexture.bind(gl), parameter = gl.texParameterf.bind(gl), query = gl.getParameter.bind(gl), extension = gl.getExtension.bind(gl), textureData = gl.texImage2D.bind(gl), data = gl.bufferData.bind(gl), sub = gl.bufferSubData.bind(gl), use = gl.useProgram.bind(gl), draw = gl.drawArrays.bind(gl);
          gl.bindTexture = (target, texture) => { r.texture = texture; return bind(target, texture); };
          gl.texParameterf = (target, name, value) => { r.sampling.push({ texture: r.created.textures.indexOf(r.texture), value }); if (phase === 'write-failure') throw Error('Optional filtering unavailable'); return parameter(target, name, value); };
          gl.getExtension = name => { r.queries.push(name); return phase === 'fallback' ? null : extension(name); };
          gl.getParameter = name => { if (ext && name === ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT) { r.capabilityQueries++; if (phase === 'query-failure') throw Error('Optional capability unavailable'); if (phase === 'capped') return Math.min(2, maximum); } return query(name); };
          gl.texImage2D = (...args) => { if (args.at(-1) instanceof Uint8Array) r.atlases.push({ texture: r.created.textures.indexOf(r.texture), pending: digest(args.at(-1)) }); return textureData(...args); };
          gl.bufferData = (target, values, ...args) => { if (values instanceof Float32Array && [19203, 36400, 41470].includes(values.length / 9)) r.points.push({ count: values.length / 9, pending: digest(values) }); return data(target, values, ...args); };
          gl.bufferSubData = (...args) => { r.uploads++; return sub(...args); };
          gl.useProgram = program => { window.__program = program; return use(program); };
          gl.drawArrays = (mode, first, count) => { if (__layer === 'diffuse') { if (__program !== r.created.programs[1]) return; draw(mode, __modelIndex * 384, 384); if (__modelIndex !== 3) draw(mode, __modelCount * 384 + __modelIndex * 384, 384); return; } return draw(mode, first, count); };
          return gl;
        };
      }, phase);
      const marker = '  global.UniverseFlight = {'; const source = sources[phase === 'baseline' ? 'baseline' : 'refined']; assert.ok(source.includes(marker));
      await page.addScriptTag({ content: source.replace(marker, '  global.__models=makeRegion;\n' + marker) });
      await page.evaluate(() => { window.__scene = UniverseFlight.create(document.querySelector('canvas'), { onStatus(status) { window.__status = status; }, onTelemetry(info) { window.__info = info; } }); }); await page.waitForFunction(() => window.__status?.state === 'ready');
      assert.equal(await page.evaluate(() => !!__probe.extension), true, 'This comparison browser supports the optional filter');
      async function pose(v) { await page.evaluate(v => { const saved = __scene.snapshot(), d = v.aim.map((value, i) => value - v.position[i]); Object.assign(saved.settings, { mode: v.mode || 'explore', region: v.region, beta: v.beta || 0, compareRest: false, quality: v.quality || 'high', fov: v.fov, exposure: .8 }); Object.assign(saved.state, { position: v.position, yaw: Math.atan2(d[0], d[2]), pitch: Math.atan2(d[1], Math.hypot(d[0], d[2])), distanceLy: 17, universeYears: 9, travelerYears: 4 }); saved.targetId = null; window.__layer = v.layer; window.__modelIndex = v.index; window.__modelCount = __models(v.region).galaxies.length; if (!__scene.restore(saved)) throw Error('Rejected native pose'); }, v); }
      async function capture(name) { const bytes = Buffer.from(await page.evaluate(() => __scene.capture().dataUrl.split(',')[1]), 'base64'); images.set(phase + ':' + name, bytes); const file = phase + '-' + name + '.png'; fs.writeFileSync(path.join(report, file), bytes); result.captures.push({ phase, name, file, hash: hash(bytes), statistics: stats(bytes) }); }
      const selected = ['baseline', 'refined'].includes(phase) ? views : views.filter(v => ['spiral-shallow', 'blue-star', 'spiral-low'].includes(v.name));
      for (const v of selected) { await pose(v); await capture(v.name); }
      if (['baseline', 'refined'].includes(phase)) {
        routes[phase] = []; const catalog = await page.evaluate(() => UniverseFlight.flybys());
        for (const route of catalog) for (const highlight of route.highlights) { const snapshot = await page.evaluate(({ route, highlight }) => { window.__layer = 'full'; __scene.set({ mode: 'explore', region: route.region, quality: 'high' }); if (!__scene.startFlyby(route.id) || !__scene.seekFlybyHighlight(highlight.id)) throw Error('Missing scenic highlight'); return __scene.snapshot(); }, { route, highlight }); routes[phase].push({ id: route.id, highlight: highlight.id, snapshot }); }
        await pose(views[2]); const frozen = await page.evaluate(() => ({ view: __scene.snapshot(), pixels: __scene.capture().dataUrl, queries: __probe.queries.length, writes: __probe.sampling.length, uploads: __probe.uploads }));
        await page.waitForTimeout(180); assert.deepEqual(await page.evaluate(() => __scene.snapshot()), frozen.view); assert.equal(await page.evaluate(() => __scene.capture().dataUrl), frozen.pixels);
        await page.evaluate(() => { __scene.look(.1, .03); __scene.set({ exposure: .6, fov: 62, quality: 'auto' }); });
        const after = await page.evaluate(() => ({ queries: __probe.queries.length, writes: __probe.sampling.length, uploads: __probe.uploads })); assert.deepEqual(after, { queries: frozen.queries, writes: frozen.writes, uploads: frozen.uploads }); result.geometry.push({ phase, pausedPixelsStable: true, lookLensExposureAutoReuseSamplingAndGeometry: true });
      }
      populations[phase] = await page.evaluate(async () => { const output = {}; for (const record of __probe.points) output[record.count] = await record.pending; return output; });
      atlasHashes[phase] = await page.evaluate(async () => Promise.all(__probe.atlases.map(async item => ({ texture: item.texture, hash: await item.pending }))));
      const sampling = await page.evaluate(() => { const r = __probe; const values = r.created.textures.map(texture => { r.gl.bindTexture(r.gl.TEXTURE_2D, texture); return r.gl.getTexParameter(r.gl.TEXTURE_2D, r.extension.TEXTURE_MAX_ANISOTROPY_EXT); }); return { writes: r.sampling, queries: r.queries, capabilityQueries: r.capabilityQueries, values, maximum: r.maximum }; });
      assert.equal(sampling.values[1], 1, 'Cloud texture retains its original sampler'); assert.ok(sampling.writes.every(item => item.texture === 0 && item.value >= 1 && item.value <= Math.min(4, sampling.maximum)));
      if (phase === 'refined') { assert.equal(sampling.values[0], Math.min(4, sampling.maximum)); assert.equal(sampling.capabilityQueries, 1); }
      if (phase === 'capped') { assert.deepEqual(sampling.writes.map(item => item.value), [Math.min(2, sampling.maximum), 1]); assert.equal(sampling.values[0], 1); }
      if (['baseline', 'fallback', 'query-failure', 'write-failure'].includes(phase)) assert.equal(sampling.values[0], 1);
      await page.evaluate(() => __scene.dispose()); const resources = await page.evaluate(() => ({ created: Object.fromEntries(Object.entries(__probe.created).map(([key, value]) => [key, value.length])), deleted: __probe.deleted, error: __probe.gl.getError() }));
      assert.deepEqual(resources.created, { textures: 2, buffers: 2, programs: 2 }); assert.deepEqual(resources.deleted, resources.created); assert.equal(resources.error, 0); result.resources.push({ phase, ...resources, sampling });
      await page.close(); save();
    }
    assert.deepEqual(populations.refined, populations.baseline); assert.deepEqual(routes.refined, routes.baseline); assert.equal(routes.refined.length, 12); result.pointHashes = populations.refined; result.highlightSnapshots = routes.refined;
    for (const phase of Object.keys(atlasHashes)) assert.deepEqual(atlasHashes[phase], atlasHashes.baseline);
    check('All point populations, both atlas bytes, twelve authored camera poses, and two textures/buffers/programs per scene remain unchanged');
    for (const name of ['blue-star', 'nebula', 'spiral-low']) assert.equal(hash(images.get('refined:' + name)), hash(images.get('baseline:' + name)), name + ' preserves exact pixels');
    for (const phase of ['fallback', 'query-failure', 'write-failure']) for (const name of ['spiral-shallow', 'blue-star', 'spiral-low']) assert.equal(hash(images.get(phase + ':' + name)), hash(images.get('baseline:' + name)), phase + ':' + name + ' safely preserves baseline pixels');
    check('Stellar/cloud scenery, Low quality, unsupported capability and optional query/write failures preserve baseline pixels exactly');
    for (const v of views) { const before = stats(images.get('baseline:' + v.name)), after = stats(images.get('refined:' + v.name)); result.comparisons.push({ name: v.name, before, after, ...difference(images.get('baseline:' + v.name), images.get('refined:' + v.name)) }); }
    const portraits = result.comparisons.filter(item => /^(spiral|twoarm|barred)-(oblique|shallow)$/.test(item.name));
    for (const item of portraits) { assert.ok(item.changedPixels > 50, item.name + ' visibly changes'); assert.ok(item.after.armGradientEnergy > item.before.armGradientEnergy * 1.01, item.name + ' preserves more arm contrast'); assert.ok(Math.abs(item.after.meanLuminance / item.before.meanLuminance - 1) < .08, item.name + ' integrated display brightness remains bounded'); }
    check('Spiral, two-arm and barred oblique portraits retain more resolved arm contrast with bounded integrated display brightness');
    assert.ok(result.captures.every(item => item.statistics.clippedWhiteFraction < .03)); assert.deepEqual(result.errors, []);
    check('Grazing, near-disk, distant-group and relativistic views remain finite and avoid broad white clipping');
    check('Sampler capability is cached, Low switches back to one, Auto/High share the capped value, and cloud sampling stays unchanged');
    result.completed = true; save(); console.log(JSON.stringify({ completed: true, captures: result.captures.length, checks: result.checks.length, portraits: portraits.map(item => ({ name: item.name, armContrastRatio: item.after.armGradientEnergy / item.before.armGradientEnergy, brightnessRatio: item.after.meanLuminance / item.before.meanLuminance })) }, null, 2));
  } catch (error) { result.failure = String(error); save(); throw error; } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
