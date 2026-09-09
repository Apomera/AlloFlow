// Synthetic browser benchmark of the actual persistence paths, not a page INP score.
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const { chromium } = require('@playwright/test');
const root = path.resolve(__dirname, '..');
const baseline = path.resolve(root, process.argv[2] || 'scratch/stem-performance-pass2/stem_lab_module.before.js');
function block(source, name) {
  const start = source.indexOf('// ' + name + '_START'), end = source.indexOf('// ' + name + '_END', start);
  if (start < 0 || end < 0) throw Error('Missing ' + name);
  return source.slice(start, end);
}
async function run() {
  const before = fs.readFileSync(baseline, 'utf8'), after = fs.readFileSync(path.join(root, 'stem_lab/stem_lab_module.js'), 'utf8');
  const start = before.indexOf('// Save to localStorage on meaningful changes');
  const end = before.indexOf('// ── Tutorial Overlay Helper', start);
  if (start < 0 || end < 0) throw Error('Baseline autosave effect not found');
  const code = { before: block(before, 'BEEHIVE_PERSISTENCE_HELPER') + before.slice(start, end), after: block(after, 'BEEHIVE_PERSISTENCE_HELPER') + block(after, 'STEM_AUTOSAVE') };
  const server = http.createServer((req, res) => { res.setHeader('Content-Type', 'text/html'); res.end('<!doctype html><title>Autosave benchmark</title>'); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto('http://127.0.0.1:' + server.address().port);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const result = await page.evaluate(code => {
      const rows = [];
      for (const workload of ['unsaved-tool-updates', 'saved-tool-burst']) {
        for (const mode of ['before', 'after']) {
          localStorage.clear();
          let serializations = 0, writes = 0;
          const storage = { getItem: key => localStorage.getItem(key), setItem: (key, value) => { writes++; localStorage.setItem(key, value); } };
          const json = { stringify: value => { serializations++; return JSON.stringify(value); } };
          let saver;
          if (mode === 'before') {
            const save = Function('React', 'labToolData', 'localStorage', 'JSON', code.before);
            saver = { queue: data => save({ useEffect: fn => fn() }, data, storage, json), flush() {}, dispose() {} };
          } else saver = Function('window', 'document', 'localStorage', 'JSON', code.after + '\nreturn _createStemAutosave();')(window, document, storage, json);
          const initial = { _persisted: true, wave: { frequency: 2, samples: Array.from({ length: 10000 }, (_, i) => i / 10) } };
          saver.queue(initial); saver.flush(); serializations = writes = 0;
          const start = performance.now();
          for (let i = 0; i < 300; i++) {
            saver.queue(workload === 'unsaved-tool-updates' ? { ...initial, roadReady: { tick: i } } : { ...initial, wave: { ...initial.wave, frequency: i } });
          }
          saver.flush(); const elapsedMs = performance.now() - start; saver.dispose();
          rows.push({ mode, workload, updates: 300, serializations, writes, elapsedMs, payloadBytes: localStorage.getItem('alloflow_stemlab_v2').length, finalFrequency: JSON.parse(localStorage.getItem('alloflow_stemlab_v2')).wave.frequency });
        }
      }
      return { cpuSlowdown: 4, kind: 'synthetic persistence path benchmark; no full-app React rendering or user INP measurement', rows };
    }, code);
    const output = path.join(root, 'reports/stem-performance-pass2/autosave.json');
    fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify(result, null, 2));
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
