// Counts cache enumeration independently of browser/GPU timing noise.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const baseline = path.resolve(root, process.argv[2] || 'scratch/stem-performance-pass2/stem_tool_roadready.before.js');
const rows = [];
for (const [mode, file] of [['before', baseline], ['after', path.join(root, 'stem_lab/stem_tool_roadready.js')]]) {
  const source = fs.readFileSync(file, 'utf8');
  const start = source.indexOf('  function createRoadSpline('), end = source.indexOf('  var BIOMES =', start);
  const body = source.slice(start, end);
  if (!body.includes('var samples = {};')) throw Error('Spline cache declaration changed');
  let enumerations = 0, entriesVisited = 0;
  function makeSamples() {
    return new Proxy({}, { ownKeys(target) { enumerations++; const keys = Reflect.ownKeys(target); entriesVisited += keys.length; return keys; } });
  }
  const window = { React: {}, StemLab: { registerTool() {} }, __RR_TEST_EXPORTS__: {} };
  Function('window', 'document', 'makeSamples', source.slice(0, start) + body.replace('var samples = {};', 'var samples = makeSamples();') + source.slice(end))(
    window, { getElementById() { return {}; }, addEventListener() {} }, makeSamples);
  const spline = window.__RR_TEST_EXPORTS__.roadReady.createRoadSpline(42, 48);
  spline.centerAt(-500); spline.centerAt(500);
  enumerations = entriesVisited = 0;
  let checksum = 0;
  const started = performance.now();
  for (let i = 0; i < 1000; i++) { const y = (i % 800) - 400 + 0.25; checksum += spline.centerAt(y) + spline.headingAt(y); }
  rows.push({ mode, queries: 2000, enumerations, entriesVisited, elapsedMs: performance.now() - started, checksum, sourceSha256: crypto.createHash('sha256').update(source).digest('hex') });
}
if (rows[0].checksum !== rows[1].checksum) throw Error('Spline output changed');
const report = { kind: 'instrumented cache operation counts; Proxy timing is not an application speed measurement', rows };
fs.mkdirSync(path.join(root, 'reports/stem-performance-pass2'), { recursive: true });
fs.writeFileSync(path.join(root, 'reports/stem-performance-pass2/spline-cache.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
