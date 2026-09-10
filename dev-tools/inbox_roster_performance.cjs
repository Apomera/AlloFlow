const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), cp = require('node:child_process');
const { chromium } = require('@playwright/test');
const rootPath = path.resolve(__dirname, '..'), baselineRef = process.env.INBOX_BASELINE_REF || '52ee51a6a';
const modules = { before: cp.execFileSync('git', ['show', baselineRef + ':view_submission_inbox_module.js'], { cwd: rootPath, encoding: 'utf8', maxBuffer: 2e6 }), after: fs.readFileSync(path.join(rootPath, 'view_submission_inbox_module.js'), 'utf8') };
async function run() {
  const server = http.createServer((req, res) => {
    const lib = req.url === '/react.js' ? 'react' : req.url === '/react-dom.js' ? 'react-dom' : null;
    res.setHeader('Content-Type', lib ? 'application/javascript' : 'text/html');
    res.end(lib ? fs.readFileSync(path.join(rootPath, 'desktop/web-app/node_modules', lib, 'umd', lib + '.production.min.js')) : '<!doctype html><div id="before"></div><div id="after"></div><script src="/react.js"></script><script src="/react-dom.js"></script>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage(), errors = [], scenarios = [];
    page.on('pageerror', error => errors.push(error.message));
    const files = count => Array.from({ length: count }, (_, i) => ({ name: 'synthetic-' + i + '.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ kind: 'alloflow-student-submission', nickname: 'LEARNER ' + String(i).padStart(4, '0'), docTitle: 'Synthetic assignment', responses: { q1: 'Synthetic answer' } })) }));
    for (const count of [40, 300]) {
      await page.goto('http://127.0.0.1:' + server.address().port);
      const cdp = await page.context().newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      await page.evaluate(({ modules, count }) => {
        window.fixtures = {};
        for (const mode of ['before', 'after']) {
          window.AlloModules = {}; Function(modules[mode])();
          const Panel = window.AlloModules.SubmissionInbox.SubmissionInbox;
          const props = { isOpen: true, onClose: () => {}, rosterKey: { students: Object.fromEntries(Array.from({ length: count }, (_, i) => ['Learner ' + String(i).padStart(4, '0'), ''])) }, t: (key, fallback) => fallback || key };
          const root = ReactDOM.createRoot(document.getElementById(mode)); fixtures[mode] = { Panel, props, root };
          ReactDOM.flushSync(() => root.render(React.createElement(Panel, props)));
        }
      }, { modules, count });
      for (const mode of ['before', 'after']) {
        await page.locator('#' + mode + ' input[type="file"][multiple]').setInputFiles(files(count));
        await page.waitForFunction(({ mode, count }) => document.querySelectorAll('#' + mode + ' [aria-label="Imported submission queue table"] tbody > tr').length === count, { mode, count });
      }
      const result = await page.evaluate(async count => {
        const snapshots = {}, normalizationCalls = {}, runs = [];
        for (const mode of ['before', 'after']) {
          const { Panel, props, root } = fixtures[mode]; let calls = 0;
          const lower = String.prototype.toLowerCase;
          String.prototype.toLowerCase = function() { if (/^learner /i.test(String(this))) calls++; return lower.call(this); };
          try { ReactDOM.flushSync(() => root.render(React.createElement(Panel, { ...props }))); } finally { String.prototype.toLowerCase = lower; }
          normalizationCalls[mode] = calls;
          snapshots[mode] = [...document.querySelectorAll('#' + mode + ' [aria-label="Imported submission queue table"] tbody > tr')].map(row => row.textContent);
        }
        for (const mode of ['before','after','before','after','before','after','before','after','after','before','before','after','after','before','before','after']) {
          const { Panel, props, root } = fixtures[mode];
          await new Promise(resolve => requestAnimationFrame(resolve));
          const start = performance.now();
          for (let i = 0; i < 4; i++) ReactDOM.flushSync(() => root.render(React.createElement(Panel, { ...props })));
          runs.push({ mode, fourUpdatesMs: performance.now() - start });
        }
        const measured = runs.slice(6), medians = Object.fromEntries(['before','after'].map(mode => [mode, measured.filter(run => run.mode === mode).map(run => run.fourUpdatesMs).sort((a,b) => a-b)[2]]));
        const refreshedRoster = {};
        for (const mode of ['before','after']) {
          const { Panel, props, root } = fixtures[mode];
          ReactDOM.flushSync(() => root.render(React.createElement(Panel, { ...props, rosterKey: { students: { 'Learner-0000': '' } } })));
          const host = document.getElementById(mode);
          const confirm = [...host.querySelectorAll('button')].find(button => button.textContent === 'Confirm normalized roster match');
          refreshedRoster[mode] = { unknown: host.querySelectorAll('[title="No roster student matched this nickname"]').length, confirmationRequired: !!confirm };
          if (confirm) ReactDOM.flushSync(() => confirm.click());
          refreshedRoster[mode].confirmed = !![...host.querySelectorAll('button')].find(button => button.textContent === 'Identity confirmed' && button.getAttribute('aria-pressed') === 'true');
        }
        for (const mode of ['before','after']) fixtures[mode].root.unmount();
        return { students: count, submissions: count, normalizationCalls, rowTextParity: JSON.stringify(snapshots.before) === JSON.stringify(snapshots.after), rowsCompared: snapshots.before.length, refreshedRoster, warmup: runs.slice(0,6), measured, medians };
      }, count);
      if (!result.rowTextParity || result.rowsCompared !== count || Object.values(result.refreshedRoster).some(r => r.unknown !== count - 1 || !r.confirmationRequired || !r.confirmed)) throw Error('Queue or refreshed roster parity failed');
      scenarios.push(result); await cdp.detach();
    }
    if (errors.length) throw Error(errors.join('\n'));
    const result = { baselineRef, cpuSlowdown: 4, scope: 'Actual generated Inbox, synthetic JSON file imports, mounted queue updates, production React, inline component styles. Three warmups and five alternating measured runs per version. Normalization counters measured separately.', scenarios, errors };
    fs.mkdirSync(path.join(rootPath, 'reports/inbox-roster-performance'), { recursive: true });
    fs.writeFileSync(path.join(rootPath, 'reports/inbox-roster-performance/browser.json'), JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify(scenarios.map(({ students, normalizationCalls, rowTextParity, medians }) => ({ students, normalizationCalls, rowTextParity, medians })), null, 2));
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
