// Paired timing of fixed before/after sources in one Chromium page, without counters.
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const { chromium } = require('@playwright/test'), esbuild = require('esbuild');
const root = path.resolve(__dirname, '..');
const codes = Object.fromEntries([['before', 'scratch/history-performance/source.before.jsx'], ['after', 'view_history_panel_source.jsx']].map(([mode, file]) => [mode, esbuild.transformSync(fs.readFileSync(path.join(root, file), 'utf8') + '\nreturn HistoryPanel;', { loader: 'jsx', target: 'es2020' }).code]));
async function run() {
  const server = http.createServer((req, res) => {
    if (req.url === '/react.js' || req.url === '/react-dom.js') {
      const lib = req.url === '/react.js' ? 'react' : 'react-dom'; res.setHeader('Content-Type', 'application/javascript');
      res.end(fs.readFileSync(path.join(root, 'desktop/web-app/node_modules', lib, 'umd', lib + '.production.min.js')));
    } else { res.setHeader('Content-Type', 'text/html'); res.end('<!doctype html><div id="root"></div><script src="/react.js"></script><script src="/react-dom.js"></script>'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true }); const page = await browser.newPage({ locale: 'en-US', timezoneId: 'America/New_York' });
    await page.goto('http://127.0.0.1:' + server.address().port);
    const cdp = await page.context().newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const result = await page.evaluate(async codes => {
      window.History = () => null;
      const Panels = Object.fromEntries(Object.entries(codes).map(([mode, code]) => [mode, Function('React', code)(React)]));
      const rows = Array.from({ length: 400 }, (_, i) => ({ id: 'id-' + i, _artifactInstanceId: 'artifact-history-' + String(i).padStart(8, '0'), title: 'Resource ' + i, type: ['quiz','math','timeline','faq'][i % 4], timestamp: '2026-09-01T12:00:00Z', meta: 'Chapter ' + i, data: {} }));
      const props = { history: rows, units: [], activeUnitId: 'all', activeSidebarTab: 'history', isTeacherMode: true, editingId: null, movingItemId: null,
        projectFileInputRef: { current: null }, getFilteredHistory: () => rows, getDefaultTitle: type => 'Label ' + type, getIconForType: () => null, sanitizeString: value => value, t: key => key };
      const root = ReactDOM.createRoot(document.getElementById('root')), runs = [];
      // Warm both component implementations once; then alternate to reduce order bias.
      for (const mode of ['before','after','before','after','after','before','before','after']) {
        ReactDOM.flushSync(() => root.render(null)); await new Promise(resolve => requestAnimationFrame(resolve));
        const start = performance.now(); ReactDOM.flushSync(() => root.render(React.createElement(Panels[mode], props)));
        const mountMs = performance.now() - start, updateStart = performance.now();
        for (let i = 0; i < 4; i++) ReactDOM.flushSync(() => root.render(React.createElement(Panels[mode], { ...props, pendingSync: i % 2 === 0 })));
        runs.push({ mode, mountMs, fourUpdatesMs: performance.now() - updateStart, rows: document.querySelectorAll('[role="listitem"]').length });
      }
      root.unmount();
      const measured = runs.slice(2), medians = {};
      for (const mode of ['before','after']) {
        const samples = measured.filter(run => run.mode === mode);
        medians[mode] = Object.fromEntries(['mountMs','fourUpdatesMs'].map(key => [key, samples.map(run => run[key]).sort((a,b) => a-b)[1]]));
      }
      return { warmupRuns: runs.slice(0, 2), measured, medians };
    }, codes);
    if (result.measured.some(run => run.rows !== 400)) throw Error('Panel row count changed');
    fs.writeFileSync(path.join(root, 'reports/history-performance/paired-timing.json'), JSON.stringify({ cpuSlowdown: 4, scope: 'one page; fixed before/after sources; one warmup and three measured runs per version; synthetic history, no production CSS', ...result }, null, 2) + '\n');
    console.log(JSON.stringify(result.medians, null, 2));
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
