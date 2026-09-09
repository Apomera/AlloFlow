// Compare real HistoryPanel renders against the preceding committed performance pass.
const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), cp = require('node:child_process');
const { chromium } = require('@playwright/test'), esbuild = require('esbuild');
const rootPath = path.resolve(__dirname, '..'), baselineRef = process.env.HISTORY_BASELINE_REF || '7f1fdcd39';
const sources = { before: cp.execFileSync('git', ['show', baselineRef + ':view_history_panel_source.jsx'], { cwd: rootPath, encoding: 'utf8' }), after: fs.readFileSync(path.join(rootPath, 'view_history_panel_source.jsx'), 'utf8') };
const codes = Object.fromEntries(Object.entries(sources).map(([mode, source]) => [mode, esbuild.transformSync(source + '\nreturn HistoryPanel;', { loader: 'jsx', target: 'es2020' }).code]));
async function run() {
  const server = http.createServer((req, res) => {
    const lib = req.url === '/react.js' ? 'react' : req.url === '/react-dom.js' ? 'react-dom' : null;
    res.setHeader('Content-Type', lib ? 'application/javascript' : 'text/html');
    res.end(lib ? fs.readFileSync(path.join(rootPath, 'desktop/web-app/node_modules', lib, 'umd', lib + '.production.min.js')) : '<!doctype html><div id="root"></div><script src="/react.js"></script><script src="/react-dom.js"></script>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ locale: 'en-US', timezoneId: 'America/New_York' }), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:' + server.address().port);
    const cdp = await page.context().newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const scenarios = await page.evaluate(async codes => {
      window.History = () => null;
      const Panels = Object.fromEntries(Object.entries(codes).map(([mode, code]) => [mode, Function('React', code)(React)]));
      const host = document.getElementById('root'), root = ReactDOM.createRoot(host), results = [];
      for (const unitCount of [40, 400]) {
        const units = Array.from({ length: unitCount }, (_, i) => ({ id: 'unit-' + i, name: 'Study unit ' + i }));
        const history = Array.from({ length: 400 }, (_, i) => ({ id: 'id-' + i, _artifactInstanceId: 'artifact-history-' + String(i).padStart(8, '0'), title: 'Resource ' + i, unitId: 'unit-' + (i % unitCount), type: 'quiz', timestamp: '2026-09-01T12:00:00Z' }));
        const props = { history, units, activeUnitId: 'all', activeSidebarTab: 'history', isTeacherMode: true, editingId: null, movingItemId: null,
          projectFileInputRef: { current: null }, getFilteredHistory: () => history, getDefaultTitle: type => type, getIconForType: () => null, sanitizeString: value => value, t: key => key };
        const snapshots = {}, counts = {};
        for (const mode of ['before', 'after']) {
          let reads = 0;
          const countedUnits = units.map(unit => ({ get id() { reads++; return unit.id; }, name: unit.name }));
          ReactDOM.flushSync(() => root.render(null));
          ReactDOM.flushSync(() => root.render(React.createElement(Panels[mode], { ...props, units: countedUnits })));
          counts[mode] = reads;
          snapshots[mode] = [...host.querySelectorAll('[role="listitem"]')].map(row => row.textContent);
        }
        const runs = [];
        for (const mode of ['before','after','before','after','after','before','before','after']) {
          ReactDOM.flushSync(() => root.render(null)); await new Promise(resolve => requestAnimationFrame(resolve));
          const start = performance.now(); ReactDOM.flushSync(() => root.render(React.createElement(Panels[mode], props)));
          const mountMs = performance.now() - start, updateStart = performance.now();
          for (let i = 0; i < 4; i++) ReactDOM.flushSync(() => root.render(React.createElement(Panels[mode], { ...props, pendingSync: i % 2 === 0 })));
          runs.push({ mode, mountMs, fourUpdatesMs: performance.now() - updateStart, rows: host.querySelectorAll('[role="listitem"]').length });
        }
        const measured = runs.slice(2), medians = {};
        for (const mode of ['before', 'after']) medians[mode] = Object.fromEntries(['mountMs', 'fourUpdatesMs'].map(key => [key, measured.filter(run => run.mode === mode).map(run => run[key]).sort((a,b) => a-b)[1]]));
        results.push({ unitCount, resourceCount: history.length, unitIdReads: counts, rowTextParity: JSON.stringify(snapshots.before) === JSON.stringify(snapshots.after), warmupRuns: runs.slice(0,2), measured, medians });
      }
      root.unmount(); return results;
    }, codes);
    if (errors.length || scenarios.some(s => !s.rowTextParity || s.measured.some(r => r.rows !== 400))) throw Error('Panel parity failed: ' + errors.join(', '));
    const result = { baselineRef, cpuSlowdown: 4, scope: 'Warmed actual component; production React; no utility CSS; three alternating measured runs per version. ID counters run separately from timings and include unit selector reads.', scenarios, errors };
    fs.mkdirSync(path.join(rootPath, 'reports/history-unit-performance'), { recursive: true });
    fs.writeFileSync(path.join(rootPath, 'reports/history-unit-performance/browser.json'), JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify(scenarios.map(({ unitCount, unitIdReads, rowTextParity, medians }) => ({ unitCount, unitIdReads, rowTextParity, medians })), null, 2));
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
