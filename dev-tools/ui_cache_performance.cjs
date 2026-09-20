const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), cp = require('node:child_process');
const assert = require('node:assert/strict');
const { chromium } = require('@playwright/test');
const rootPath = path.resolve(__dirname, '..');
const baselineRef = process.env.UI_CACHE_BASELINE_REF || '90b4d80eca3ba84d27eaae8757658be78220e8c3';
const targets = [
  { file: 'view_submission_inbox_module.js', module: 'SubmissionInbox', component: 'SubmissionInbox', key: 'allo_submissioninbox_ui_i18n_v1', title: '📥 Import student submissions' },
  { file: 'seating_chart_module.js', module: 'SeatingChart', component: 'SeatingChartPanel', key: 'allo_seatingchart_ui_i18n_v1', title: 'Seating Chart' },
];
async function main() {
  const server = http.createServer((req, res) => {
    const lib = req.url === '/react.js' ? 'react' : req.url === '/react-dom.js' ? 'react-dom' : null;
    res.setHeader('Content-Type', lib ? 'application/javascript' : 'text/html');
    res.end(lib ? fs.readFileSync(path.join(rootPath, 'desktop/web-app/node_modules', lib, 'umd', lib + '.production.min.js')) : '<!doctype html><div id="app"></div><script src="/react.js"></script><script src="/react-dom.js"></script>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  const errors = [], scenarios = [], behavior = [];
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    page.on('pageerror', error => errors.push(error.message));
    for (const target of targets) {
      const modules = {
        before: cp.execFileSync('git', ['show', baselineRef + ':' + target.file], { encoding: 'utf8', maxBuffer: 2e6 }),
        after: fs.readFileSync(path.join(rootPath, target.file), 'utf8'),
      };
      for (const labels of [100, 2000]) {
        const snapshots = {};
        for (const mode of ['before', 'after']) {
          await page.goto('http://127.0.0.1:' + server.address().port);
          await page.evaluate(({ target, code, labels }) => {
            window.target = target;
            const cache = { Spanish: { [target.title]: 'ES·' + target.title }, French: { [target.title]: 'FR·' + target.title } };
            for (const language of Object.keys(cache)) for (let i = 0; i < labels; i++) cache[language]['Synthetic label ' + i] = 'Synthetic translation '.repeat(6) + i;
            window.rawCache = JSON.stringify(cache);
            localStorage.clear(); localStorage.setItem(target.key, rawCache);
            window.metrics = { reads: 0, parses: 0, bytesRead: 0 };
            const getItem = Storage.prototype.getItem, parse = JSON.parse;
            Storage.prototype.getItem = function(key) {
              const value = getItem.call(this, key);
              if (key === target.key) { metrics.reads++; metrics.bytesRead += value ? new TextEncoder().encode(value).length : 0; }
              return value;
            };
            JSON.parse = function(value, ...args) { if (value === rawCache) metrics.parses++; return parse.call(this, value, ...args); };
            window.AlloModules = {}; Function(code)();
            window.Panel = AlloModules[target.module][target.component];
            window.props = { isOpen: true, onClose() {}, rosterKey: { students: { 'PRIVATE_FIXTURE_STUDENT': '' }, groups: {} }, setRosterKey() {}, t: (key, fallback) => fallback || key };
            window.root = ReactDOM.createRoot(document.getElementById('app'));
            window.render = () => ReactDOM.flushSync(() => root.render(React.createElement(Panel, { ...props })));
            render();
          }, { target, code: modules[mode], labels });
          await page.waitForFunction(title => document.getElementById('app').textContent.includes(title), target.title);
          const result = await page.evaluate(() => {
            metrics = { reads: 0, parses: 0, bytesRead: 0 };
            const before = document.getElementById('app').textContent;
            for (let i = 0; i < 100; i++) render();
            return { ...metrics, uiStable: before === document.getElementById('app').textContent, text: before, cacheBytes: new TextEncoder().encode(rawCache).length };
          });
          assert.equal(result.reads, mode === 'before' ? 100 : 0);
          assert.equal(result.parses, mode === 'before' ? 100 : 0);
          assert.equal(result.uiStable, true);
          snapshots[mode] = result.text;
          const { text, ...counts } = result;
          scenarios.push({ component: target.module, mode, labelsPerLanguage: labels, renders: 100, ...counts });
        }
        assert.equal(snapshots.before, snapshots.after);
      }

      // Keep using the optimized mounted panel; each language's saved pack must
      // remain available without another storage read.
      for (const [language, prefix] of [['Spanish', 'ES·'], ['French', 'FR·'], ['Spanish', 'ES·']]) {
        await page.evaluate(language => { window.__alloTextLanguage = language; render(); }, language);
        await page.waitForFunction(({ prefix, title }) => document.getElementById('app').textContent.includes(prefix + title), { prefix, title: target.title });
      }
      assert.equal(await page.evaluate(() => metrics.reads), 0);
      await page.evaluate(() => {
        window.translationPrompts = [];
        window.callGemini = async prompt => {
          translationPrompts.push(prompt);
          const list = JSON.parse(prompt.slice(prompt.indexOf('[')));
          return JSON.stringify(Object.fromEntries(list.map(label => [label, 'DE·' + label])));
        };
        window.__alloTextLanguage = 'German'; render();
      });
      await page.waitForFunction(title => document.getElementById('app').textContent.includes('DE·' + title), target.title);
      const translated = await page.evaluate(() => ({ reads: metrics.reads, prompts: translationPrompts, stored: JSON.parse(localStorage.getItem(target.key)).German[target.title] }));
      assert.equal(translated.reads, 0);
      assert.equal(translated.stored, 'DE·' + target.title);
      assert(translated.prompts.length > 0);
      assert(translated.prompts.every(prompt => !prompt.includes('PRIVATE_FIXTURE_STUDENT')));
      const remount = await page.evaluate(() => {
        root.unmount(); delete window.callGemini;
        window.__alloTextLanguage = 'Spanish';
        localStorage.setItem(target.key, JSON.stringify({ Spanish: { [target.title]: 'NEW·' + target.title } }));
        metrics.reads = 0;
        root = ReactDOM.createRoot(document.getElementById('app')); render();
        return { reads: metrics.reads, text: document.getElementById('app').textContent };
      });
      assert.equal(remount.reads, 1);
      assert(remount.text.includes('NEW·' + target.title));
      const invalid = await page.evaluate(() => {
        root.unmount(); localStorage.setItem(target.key, '{corrupt'); metrics.reads = 0;
        root = ReactDOM.createRoot(document.getElementById('app')); render();
        for (let i = 0; i < 10; i++) render();
        return { reads: metrics.reads, text: document.getElementById('app').textContent };
      });
      assert.equal(invalid.reads, 1);
      assert(invalid.text.includes(target.title));
      behavior.push({ component: target.module, cachedLanguageSwitches: true, newTranslationRenderedAndPersisted: true, studentDataExcludedFromPrompts: true, remountReloadsCache: true, corruptCacheFallsBack: true });
    }
    assert.deepEqual(errors, []);
    const report = { baselineRef, scope: 'Actual generated panels, production React, 100 parent rerenders per case, two-language synthetic caches. Counts measure unnecessary storage/parse work; no whole-app timing claims.', scenarios, behavior, errors };
    fs.mkdirSync(path.join(rootPath, 'reports/ui-cache-performance'), { recursive: true });
    fs.writeFileSync(path.join(rootPath, 'reports/ui-cache-performance/browser.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report, null, 2));
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
