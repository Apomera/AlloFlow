const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), crypto = require('node:crypto');
const { chromium } = require('@playwright/test');
const esbuild = require('esbuild');
const root = path.resolve(__dirname, '..');
const mode = process.argv.includes('--before') ? 'before' : 'after';
const source = fs.readFileSync(path.join(root, mode === 'before' ? 'scratch/history-performance/source.before.jsx' : 'view_history_panel_source.jsx'), 'utf8');
const compiled = esbuild.transformSync(source + '\nwindow.HistoryPanel = HistoryPanel;', { loader: 'jsx', target: 'es2020' }).code;
async function run() {
  const scripts = { '/react.js': 'desktop/web-app/node_modules/react/umd/react.production.min.js', '/react-dom.js': 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js' };
  const server = http.createServer((req, res) => {
    if (req.url === '/panel.js') { res.setHeader('Content-Type', 'application/javascript'); res.end(compiled); }
    else if (scripts[req.url]) { res.setHeader('Content-Type', 'application/javascript'); res.end(fs.readFileSync(path.join(root, scripts[req.url]))); }
    else { res.setHeader('Content-Type', 'text/html'); res.end('<!doctype html><div id="root"></div><script src="/react.js"></script><script src="/react-dom.js"></script><script src="/panel.js"></script>'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ locale: 'en-US', timezoneId: 'America/New_York' });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:' + server.address().port);
    const cdp = await page.context().newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const result = await page.evaluate(async () => {
      const stats = { dateCalls: 0, dateTimeFormatConstructors: 0, typeTitleCalls: 0, rowTitleCalls: 0 };
      const nativeDate = Date.prototype.toLocaleDateString, NativeFormat = Intl.DateTimeFormat;
      Date.prototype.toLocaleDateString = function(...args) { stats.dateCalls++; return nativeDate.apply(this, args); };
      Intl.DateTimeFormat = new Proxy(NativeFormat, { construct(target, args) { stats.dateTimeFormatConstructors++; return Reflect.construct(target, args); } });
      window.History = () => null; // Replace the native History constructor with the shell icon slot.
      const noop = () => {}, rows = Array.from({ length: 400 }, (_, i) => ({ id: 'id-' + i, _artifactInstanceId: 'artifact-history-' + String(i).padStart(8, '0'), title: 'Resource ' + i, type: ['quiz', 'math', 'timeline', 'faq'][i % 4], timestamp: '2026-09-01T12:00:00Z', meta: 'Chapter ' + (i % 10), data: {} }));
      const props = { history: rows, units: [], activeUnitId: 'all', activeSidebarTab: 'history', isTeacherMode: true, isUnitModalOpen: false,
        editingId: null, movingItemId: null, projectFileInputRef: { current: null }, sanitizeString: value => value,
        getFilteredHistory: () => rows, getIconForType: () => null, t: key => key,
        getDefaultTitle: (type, item) => { if (item) stats.rowTitleCalls++; else stats.typeTitleCalls++; return 'Label ' + type; }
      };
      ['addToast','handleCancelEdit','handleClearHistory','handleCreateUnit','handleDeleteHistoryItem','handleDeleteUnit','handleDragEnd','handleDragEnter','handleDragStart','handleLoadProject','handleMoveToUnit','handleRestoreView','handleSaveEdit','handleSetIsProjectSettingsOpenToTrue','handleSetIsUnitModalOpenToFalse','handleSetIsUnitModalOpenToTrue','handleSetMovingItemIdToNull','handleStartEdit','handleToggleIsHistoryMaximized','initiateSaveStudentProject','initiateSaveTeacherProject','moveItem','setActiveStation','setActiveUnitId','setEditTitle','setIsCommunityCatalogOpen','setMovingItemId','setNewUnitName','setSelHubTab','setShowSelHub','setShowStemLab','setStemLabTab'].forEach(name => props[name] = noop);
      window.__historyProps = props; window.__historyRoot = ReactDOM.createRoot(document.getElementById('root'));
      const started = performance.now(); ReactDOM.flushSync(() => __historyRoot.render(React.createElement(HistoryPanel, props)));
      const mountMs = performance.now() - started;
      const initial = { ...stats, mountMs, rows: document.querySelectorAll('[role="listitem"]').length, dates: Array.from(document.querySelectorAll('time')).map(el => [el.dateTime, el.textContent]) };
      Object.keys(stats).forEach(key => stats[key] = 0);
      const repeatedStart = performance.now();
      for (let i = 0; i < 4; i++) ReactDOM.flushSync(() => __historyRoot.render(React.createElement(HistoryPanel, { ...props, pendingSync: i % 2 === 0 })));
      return { initial, rerenders: { ...stats, renders: 4, elapsedMs: performance.now() - repeatedStart } };
    });
    await page.getByRole('searchbox', { name: 'history.search_resources_aria' }).fill('Resource 39');
    await page.waitForFunction(() => document.querySelectorAll('[role="listitem"]').length === 11);
    result.searchRows = await page.locator('[role="listitem"]').count();
    if (result.initial.rows !== 400 || errors.length) throw Error('History fixture failed: ' + errors.join(', '));
    const report = { mode, cpuSlowdown: 4, scope: 'actual HistoryPanel; synthetic 400-row pack, no CSS utility framework, no field Core Web Vitals', sourceSha256: crypto.createHash('sha256').update(source).digest('hex'), ...result, errors };
    fs.mkdirSync(path.join(root, 'reports/history-performance'), { recursive: true });
    fs.writeFileSync(path.join(root, 'reports/history-performance', mode + '.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({ ...report, initial: { ...report.initial, dates: report.initial.dates.length + ' date labels captured' } }, null, 2));
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
