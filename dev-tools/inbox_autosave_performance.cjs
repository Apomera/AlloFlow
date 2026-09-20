const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), cp = require('node:child_process');
const assert = require('node:assert/strict');
const { chromium } = require('@playwright/test');
const rootPath = path.resolve(__dirname, '..');
const baselineRef = process.env.INBOX_BASELINE_REF || '107e91b21c999fd318e48a85d3287ff87ab4c25e';
const modules = {
  before: cp.execFileSync('git', ['show', baselineRef + ':view_submission_inbox_module.js'], { encoding: 'utf8', maxBuffer: 2e6 }),
  after: fs.readFileSync(path.join(rootPath, 'view_submission_inbox_module.js'), 'utf8'),
};
const key = 'alloflow_inbox_session';
const saved = {
  globalRubric: { rubric: 'Synthetic rubric', context: 'Synthetic context' },
  anchors: Array.from({ length: 12 }, (_, i) => ({ id: 'anchor-' + i, nickname: 'Synthetic learner', docTitle: 'Fixture', question: 'Synthetic question', studentResponse: 'Synthetic example. '.repeat(2000), teacherScore: 90, teacherFeedback: 'Synthetic feedback' })),
  savedAt: '2026-09-19T12:00:00.000Z',
};
async function main() {
  const server = http.createServer((req, res) => {
    const lib = req.url === '/react.js' ? 'react' : req.url === '/react-dom.js' ? 'react-dom' : null;
    res.setHeader('Content-Type', lib ? 'application/javascript' : 'text/html');
    res.end(lib ? fs.readFileSync(path.join(rootPath, 'desktop/web-app/node_modules', lib, 'umd', lib + '.development.js')) : '<!doctype html><div id="app"></div><script src="/react.js"></script><script src="/react-dom.js"></script>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  const errors = [], scenarios = [];
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    page.on('pageerror', error => errors.push(error.message));
    const importSubmission = () => page.locator('input[type="file"][multiple]').setInputFiles({ name: 'synthetic.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ kind: 'alloflow-student-submission', nickname: 'Synthetic learner', docTitle: 'Fixture', responses: { q1: 'Synthetic answer' } })) });
    const mount = async (mode, strict = false) => {
      await page.goto('http://127.0.0.1:' + server.address().port);
      await page.evaluate(({ code, saved, key, strict }) => {
        localStorage.clear(); localStorage.setItem(key, JSON.stringify(saved));
        window.AlloModules = {}; Function(code)();
        window.Panel = AlloModules.SubmissionInbox.SubmissionInbox;
        window.props = { isOpen: true, onClose: () => render(false), rosterKey: '', t: (key, fallback) => fallback || key };
        window.root = ReactDOM.createRoot(document.getElementById('app'));
        window.render = isOpen => ReactDOM.flushSync(() => root.render(React.createElement(strict ? React.StrictMode : React.Fragment, null, React.createElement(Panel, { ...props, isOpen }))));
        render(true);
      }, { code: modules[mode], saved, key, strict });
      await importSubmission();
      await page.waitForFunction(() => [...document.querySelectorAll('textarea')].some(el => el.value === 'Synthetic rubric'));
      await page.waitForTimeout(350);
    };
    const edit = text => page.evaluate(text => {
      const input = [...document.querySelectorAll('textarea')].find(el => el.value.startsWith('Synthetic rubric'));
      if (!input) throw Error('Rubric textarea missing');
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
      ReactDOM.flushSync(() => { setter.call(input, text); input.dispatchEvent(new Event('input', { bubbles: true })); });
      if (input.value !== text) throw Error('Edit did not render');
    }, text);
    const payload = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);

    for (const mode of ['before', 'after']) {
      await mount(mode);
      await page.evaluate(key => {
        window.metrics = { writes: 0, serializedBytes: 0 };
        const setItem = Storage.prototype.setItem;
        Storage.prototype.setItem = function(k, value) {
          if (k === key) { metrics.writes++; metrics.serializedBytes += new TextEncoder().encode(value).length; }
          return setItem.call(this, k, value);
        };
      }, key);
      // Real DOM input events and React state updates; each represents another edit.
      // Keep the burst inside one browser task to make operation counts repeatable.
      await page.evaluate(() => {
        const input = [...document.querySelectorAll('textarea')].find(el => el.value === 'Synthetic rubric');
        const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
        for (let i = 0; i < 40; i++) ReactDOM.flushSync(() => {
          setter.call(input, 'Synthetic rubric edit ' + i);
          input.dispatchEvent(new Event('input', { bubbles: true }));
        });
      });
      await page.waitForTimeout(400);
      const result = await page.evaluate(key => ({ ...metrics, payload: JSON.parse(localStorage.getItem(key)) }), key);
      assert.equal(result.payload.globalRubric.rubric, 'Synthetic rubric edit 39');
      assert.deepEqual(result.payload.anchors, saved.anchors);
      assert.equal(result.writes, mode === 'before' ? 40 : 1);
      scenarios.push({ mode, edits: 40, writes: result.writes, serializedBytes: result.serializedBytes, latestRubricAndAnchorsPreserved: true });
    }

    const lifecycle = [];
    for (const strict of [false, true]) {
      await mount('after', strict);
      assert.deepEqual((await payload()).anchors, saved.anchors);
      await edit('Synthetic rubric close');
      await page.evaluate(() => render(false));
      assert.equal((await payload()).globalRubric.rubric, 'Synthetic rubric close');
      await page.evaluate(() => render(true));
      await importSubmission();
      await page.waitForFunction(() => [...document.querySelectorAll('textarea')].some(el => el.value === 'Synthetic rubric close'));
      await edit('Synthetic rubric pagehide');
      await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
      assert.equal((await payload()).globalRubric.rubric, 'Synthetic rubric pagehide');
      await edit('Synthetic rubric hidden');
      await page.evaluate(() => {
        Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      assert.equal((await payload()).globalRubric.rubric, 'Synthetic rubric hidden');
      await edit('Synthetic rubric already hidden');
      assert.equal((await payload()).globalRubric.rubric, 'Synthetic rubric already hidden');
      await page.evaluate(() => { delete document.visibilityState; });
      await edit('Synthetic rubric clear pending');
      await page.getByRole('button', { name: 'Clear saved session', exact: true }).click();
      await page.evaluate(() => { window.dispatchEvent(new Event('pagehide')); root.unmount(); });
      await page.waitForTimeout(350);
      assert.equal(await payload(), null);
      lifecycle.push({ strict, restore: true, closeAndReopen: true, pagehide: true, hidden: true, clearPendingThenUnmount: true });
    }
    await mount('after');
    await edit('Synthetic rubric unmount');
    await page.evaluate(() => ReactDOM.flushSync(() => root.unmount()));
    assert.equal((await payload()).globalRubric.rubric, 'Synthetic rubric unmount');
    assert.deepEqual(errors, []);
    const result = { baselineRef, scope: 'Actual generated inbox with local React development build; synthetic 12-anchor session and 40 DOM input events. Operation counts, not whole-app latency or Core Web Vitals.', scenarios, lifecycle, directUnmount: true, errors };
    fs.mkdirSync(path.join(rootPath, 'reports/inbox-autosave-performance'), { recursive: true });
    fs.writeFileSync(path.join(rootPath, 'reports/inbox-autosave-performance/browser.json'), JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify(result, null, 2));
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
